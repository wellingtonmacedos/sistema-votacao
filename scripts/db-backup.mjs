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
//
// Anexos (opcional): se UPLOADS_DIR estiver definida e existir, o mesmo fluxo é
// aplicado ao diretório de anexos — tar+gzip -> AES-256-GCM -> grava
// <timestamp>.uploads.tar.gz.enc (+ .meta.json). Assim fotos e PDFs enviados
// (que vivem no volume "uploads") são recuperáveis junto com o banco. No
// docker-compose aponte UPLOADS_DIR=/uploads (o volume é montado no serviço de
// backup). Sem UPLOADS_DIR, apenas o banco é copiado. Para restaurar os anexos,
// use scripts/uploads-restore.mjs.
//
// Cópia offsite (opcional): se BACKUP_S3_BUCKET estiver definida, cada arquivo
// gerado (.dump.enc e, quando houver, .uploads.tar.gz.enc, além dos respectivos
// .meta.json) é enviado para o S3 via aws-cli após ser gravado localmente.
// Requer AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY (ou credenciais de
// instância). BACKUP_S3_PREFIX define o prefixo (padrão "backups"). A retenção
// local (BACKUP_RETENTION_DAYS) não apaga o S3; aplique as regras de ciclo de
// vida (lifecycle) no bucket.

import { spawn } from 'node:child_process'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
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

// Caminho do .meta.json correspondente a um arquivo de backup cifrado.
//   x.dump.enc            -> x.meta.json            (compatível com versões antigas)
//   x.uploads.tar.gz.enc  -> x.uploads.tar.gz.meta.json
export function metaPathFor(filePath) {
  return filePath.endsWith('.dump.enc')
    ? filePath.replace(/\.dump\.enc$/, '.meta.json')
    : `${filePath.replace(/\.enc$/, '')}.meta.json`
}

function timestamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}` +
    `_${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`
  )
}

async function applyRetention(dir, keep, suffix) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(suffix)).sort()
  const excess = files.slice(0, Math.max(0, files.length - keep))
  for (const file of excess) {
    await unlink(path.join(dir, file)).catch(() => {})
    await unlink(metaPathFor(path.join(dir, file))).catch(() => {})
  }
  return excess
}

// Envia um arquivo de backup (cifrado + metadados) para o S3 via aws-cli.
async function uploadToS3(filePath) {
  const bucket = process.env.BACKUP_S3_BUCKET
  if (!bucket) return

  const prefix = (process.env.BACKUP_S3_PREFIX || 'backups').replace(/^\/+|\/+$/g, '')
  const name = path.basename(filePath)
  const metaPath = metaPathFor(filePath)

  const key = prefix ? `${prefix}/${name}` : name
  const metaKey = prefix ? `${prefix}/${path.basename(metaPath)}` : path.basename(metaPath)

  await run('aws', ['s3', 'cp', filePath, `s3://${bucket}/${key}`], process.env)
  await run('aws', ['s3', 'cp', metaPath, `s3://${bucket}/${metaKey}`], process.env)
  console.log(`[backup] Cópia offsite enviada: s3://${bucket}/${key}`)
}

// Arquiva o diretório de anexos (tar+gzip) e grava cifrado em dir.
// Retorna o caminho do arquivo gerado, ou null quando não há anexos a copiar.
async function backupUploads(dir, key, ts) {
  const uploadsDir = process.env.UPLOADS_DIR
  if (!uploadsDir) return null
  if (!existsSync(uploadsDir)) {
    console.warn(`[backup] UPLOADS_DIR (${uploadsDir}) não encontrado; anexos não serão incluídos.`)
    return null
  }

  console.log(`[backup] Arquivando anexos de ${uploadsDir}...`)
  const archive = await run('tar', ['-czf', '-', '-C', uploadsDir, '.'], process.env, { binary: true })
  if (archive.length === 0) {
    console.warn('[backup] Diretório de anexos vazio; nada a arquivar.')
    return null
  }

  const encrypted = encryptBuffer(archive, key)
  const name = `sistema_votacao_${ts}.uploads.tar.gz.enc`
  const filePath = path.join(dir, name)
  await writeFile(filePath, encrypted)

  await writeFile(
    metaPathFor(filePath),
    JSON.stringify(
      {
        file: name,
        type: 'uploads',
        source: uploadsDir,
        createdAt: new Date().toISOString(),
        sizeBytes: encrypted.length,
        sha256: createHash('sha256').update(encrypted).digest('hex'),
        format: 'AES-256-GCM',
      },
      null,
      2
    )
  )

  console.log(`[backup] Anexos concluídos: ${filePath} (${encrypted.length} bytes)`)
  return filePath
}

// Faz o snapshot cifrado apenas dos anexos (usado como snapshot pré-restauração).
export async function runUploadsBackup({ subdir } = {}) {
  const baseDir = process.env.BACKUP_DIR || '/backups'
  const dir = subdir ? path.join(baseDir, subdir) : baseDir
  await mkdir(dir, { recursive: true })
  return backupUploads(dir, loadKey(), timestamp())
}

export async function runBackup({ subdir } = {}) {
  const baseDir = process.env.BACKUP_DIR || '/backups'
  const dir = subdir ? path.join(baseDir, subdir) : baseDir
  await mkdir(dir, { recursive: true })

  const key = loadKey()
  const env = dbEnv()
  const ts = timestamp()

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
  const name = `sistema_votacao_${ts}.dump.enc`
  const filePath = path.join(dir, name)
  await writeFile(filePath, encrypted)

  const sha256 = createHash('sha256').update(encrypted).digest('hex')
  await writeFile(
    metaPathFor(filePath),
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

  // Anexos: mesma criptografia, mesmo timestamp (facilita correlacionar com o dump).
  const uploadsFile = await backupUploads(dir, key, ts)
  const artifacts = uploadsFile ? [filePath, uploadsFile] : [filePath]

  if (!subdir) {
    for (const artifact of artifacts) {
      await uploadToS3(artifact)
    }

    const keep = Number(process.env.BACKUP_RETENTION_DAYS || 7)
    const removed = [
      ...(await applyRetention(dir, keep, '.dump.enc')),
      ...(await applyRetention(dir, keep, '.uploads.tar.gz.enc')),
    ]
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
