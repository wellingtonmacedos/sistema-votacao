#!/usr/bin/env node
// Restauração de um backup criptografado do PostgreSQL.
//
// Antes de restaurar, gera automaticamente um snapshot do banco ATUAL em
// /backups/pre-restore/ (mesmo formato criptografado), para permitir reverter.
//
// Uso: node db-restore.mjs <arquivo.dump.enc>
//   Ex.: node db-restore.mjs sistema_votacao_20261120_120000.dump.enc
//
// Se o arquivo não existir localmente e BACKUP_S3_BUCKET estiver definida, ele é
// baixado do S3 (com o .meta.json correspondente, quando disponível).
//
// Variáveis: DATABASE_URL, BACKUP_ENCRYPTION_KEY, BACKUP_DIR (opcional),
//            BACKUP_S3_BUCKET/BACKUP_S3_PREFIX (opcionais, para baixar do S3)
//
// Para os anexos (arquivo .uploads.tar.gz.enc), use scripts/uploads-restore.mjs.

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { dbEnv, decryptBuffer, loadKey, metaPathFor, run, runBackup } from './db-backup.mjs'

async function downloadFromS3(filePath, fileName, dir) {
  const bucket = process.env.BACKUP_S3_BUCKET
  if (!bucket) return
  const prefix = (process.env.BACKUP_S3_PREFIX || 'backups').replace(/^\/+|\/+$/g, '')
  const base = path.basename(fileName)
  const key = prefix ? `${prefix}/${base}` : base
  const metaKey = prefix ? `${prefix}/${path.basename(metaPathFor(base))}` : path.basename(metaPathFor(base))
  const metaPath = metaPathFor(filePath)

  await mkdir(dir, { recursive: true })
  console.log(`[restore] Arquivo não encontrado localmente; baixando s3://${bucket}/${key}...`)
  await run('aws', ['s3', 'cp', `s3://${bucket}/${key}`, filePath], process.env)
  try {
    await run('aws', ['s3', 'cp', `s3://${bucket}/${metaKey}`, metaPath], process.env)
  } catch {
    console.warn('[restore] .meta.json não disponível no S3; seguindo sem verificação de sha256.')
  }
}

async function verifyIntegrity(filePath, payload) {
  const metaPath = metaPathFor(filePath)
  let meta
  try {
    meta = JSON.parse(await readFile(metaPath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('[restore] .meta.json não encontrado; pulando verificação de sha256.')
      return
    }
    throw error
  }
  if (meta.sha256) {
    const sha256 = createHash('sha256').update(payload).digest('hex')
    if (sha256 !== meta.sha256) {
      throw new Error('sha256 do arquivo não confere com o .meta.json (arquivo corrompido).')
    }
    console.log('[restore] Integridade verificada (sha256).')
  }
}

async function main() {
  const fileName = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  if (!fileName) {
    console.error('Uso: node db-restore.mjs <arquivo.dump.enc>')
    process.exit(1)
  }

  const dir = process.env.BACKUP_DIR || '/backups'
  const filePath = path.isAbsolute(fileName) ? fileName : path.join(dir, fileName)
  const key = loadKey()

  if (!existsSync(filePath)) {
    await downloadFromS3(filePath, fileName, dir)
  }

  const payload = await readFile(filePath)
  await verifyIntegrity(filePath, payload)
  const dump = decryptBuffer(payload, key)
  console.log(`[restore] Backup decifrado (${dump.length} bytes).`)

  console.log('[restore] Criando snapshot pré-restauração do banco atual...')
  const snapshot = await runBackup({ subdir: 'pre-restore' })
  console.log(`[restore] Snapshot salvo em ${snapshot}`)

  const tmp = path.join(dir, `.restore-${Date.now()}.dump`)
  await writeFile(tmp, dump)
  try {
    const env = dbEnv()
    console.log(`[restore] Restaurando em ${env.PGDATABASE}@${env.PGHOST}...`)
    await run(
      'pg_restore',
      ['--clean', '--if-exists', '--no-owner', '--no-privileges', '-d', env.PGDATABASE, tmp],
      env
    )
    console.log('[restore] Restauração concluída com sucesso.')
  } finally {
    await unlink(tmp).catch(() => {})
  }
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  main().catch((error) => {
    console.error(`[restore] ERRO: ${error.message}`)
    process.exit(1)
  })
}
