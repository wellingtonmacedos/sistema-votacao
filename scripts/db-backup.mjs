#!/usr/bin/env node
// Backup criptografado do PostgreSQL.
//
// Fluxo: pg_dump (formato "custom", já comprimido) -> criptografia autenticada
// AES-256-GCM -> grava /backups/<timestamp>.dump.enc + um .meta.json com tamanho
// e sha256 (usado para verificar integridade na restauração).
//
// Uso:
//   node db-backup.mjs            # faz um backup e sai
//   node db-backup.mjs --loop     # daemon: backup a cada BACKUP_INTERVAL_HOURS
//
// Variáveis de ambiente:
//   DATABASE_URL           (obrigatória) conexão do banco (aceita ?schema=public)
//   BACKUP_ENCRYPTION_KEY  (obrigatória) 32 bytes em base64 (padrão) ou 64 hex
//   BACKUP_DIR             (opcional, padrão /backups)
//   BACKUP_RETENTION_DAYS  (opcional, padrão 7)
//   BACKUP_INTERVAL_HOURS  (opcional, padrão 24; usado com --loop)

import { spawn } from 'node:child_process'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const MAGIC = Buffer.from('SVB1') // Sistema Votação Backup v1
const IV_LENGTH = 12
const TAG_LENGTH = 16

export function loadKey() {
  const raw = process.env.BACKUP_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('BACKUP_ENCRYPTION_KEY não definida. Gere com: openssl rand -base64 32')
  }
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('BACKUP_ENCRYPTION_KEY deve ter 32 bytes (base64 ou 64 caracteres hex).')
  }
  return key
}

export function encryptBuffer(plain, key) {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  // Layout: MAGIC(4) | IV(12) | TAG(16) | ciphertext
  return Buffer.concat([MAGIC, iv, tag, ciphertext])
}

export function decryptBuffer(payload, key) {
  if (payload.length < MAGIC.length + IV_LENGTH + TAG_LENGTH) {
    throw new Error('Backup truncado ou inválido.')
  }
  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('O arquivo não é um backup deste sistema (magic inválido).')
  }
  const iv = payload.subarray(MAGIC.length, MAGIC.length + IV_LENGTH)
  const tag = payload.subarray(MAGIC.length + IV_LENGTH, MAGIC.length + IV_LENGTH + TAG_LENGTH)
  const ciphertext = payload.subarray(MAGIC.length + IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  // Lança se a autenticação falhar (arquivo alterado ou chave errada).
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

// Converte a DATABASE_URL em variáveis PG* para o pg_dump/pg_restore. Isso evita
// o parâmetro "?schema=public" (específico do Prisma), que o libpq rejeitaria.
export function dbEnv() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não definida.')
  const parsed = new URL(url)
  return {
    ...process.env,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: parsed.pathname.replace(/^\//, ''),
  }
}

export function run(cmd, args, env, { binary = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
    const out = []
    let stderr = ''
    child.stdout.on('data', (chunk) => out.push(chunk))
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (err) => reject(new Error(`Falha ao executar ${cmd}: ${err.message}`)))
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${cmd} saiu com código ${code}: ${stderr.trim()}`))
        return
      }
      const buffer = Buffer.concat(out)
      resolve(binary ? buffer : buffer.toString())
    })
  })
}

function timestamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}` +
    `_${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`
  )
}

async function applyRetention(dir, keep) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.dump.enc')).sort()
  const excess = files.slice(0, Math.max(0, files.length - keep))
  for (const file of excess) {
    await unlink(path.join(dir, file)).catch(() => {})
    await unlink(path.join(dir, file.replace(/\.dump\.enc$/, '.meta.json'))).catch(() => {})
  }
  return excess
}

export async function runBackup({ subdir } = {}) {
  const baseDir = process.env.BACKUP_DIR || '/backups'
  const dir = subdir ? path.join(baseDir, subdir) : baseDir
  await mkdir(dir, { recursive: true })

  const key = loadKey()
  const env = dbEnv()

  console.log(`[backup] Executando pg_dump em ${env.PGDATABASE}@${env.PGHOST}...`)
  const dump = await run(
    'pg_dump',
    ['--format=custom', '--no-owner', '--no-privileges'],
    env,
    { binary: true }
  )
  if (dump.length === 0) {
    throw new Error('pg_dump não retornou dados.')
  }

  const encrypted = encryptBuffer(dump, key)
  const name = `sistema_votacao_${timestamp()}.dump.enc`
  const filePath = path.join(dir, name)
  await writeFile(filePath, encrypted)

  const sha256 = createHash('sha256').update(encrypted).digest('hex')
  await writeFile(
    filePath.replace(/\.dump\.enc$/, '.meta.json'),
    JSON.stringify(
      {
        file: name,
        database: env.PGDATABASE,
        createdAt: new Date().toISOString(),
        sizeBytes: encrypted.length,
        sha256,
        format: 'AES-256-GCM',
      },
      null,
      2
    )
  )

  console.log(`[backup] Concluído: ${filePath} (${encrypted.length} bytes)`)

  if (!subdir) {
    const removed = await applyRetention(dir, Number(process.env.BACKUP_RETENTION_DAYS || 7))
    if (removed.length > 0) {
      console.log(`[backup] Retenção: ${removed.length} backup(s) antigo(s) removido(s).`)
    }
  }

  return filePath
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const loop = process.argv.includes('--loop')

  do {
    try {
      await runBackup()
    } catch (error) {
      console.error(`[backup] ERRO: ${error.message}`)
      if (!loop) process.exitCode = 1
    }

    if (!loop) break

    const hours = Number(process.env.BACKUP_INTERVAL_HOURS || 24)
    console.log(`[backup] Próximo backup em ${hours}h.`)
    await sleep(hours * 60 * 60 * 1000)
  } while (true)
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  main()
}
