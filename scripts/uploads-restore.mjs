#!/usr/bin/env node
// Restauração dos anexos (uploads) a partir de um backup criptografado.
//
// O arquivo é gerado por db-backup.mjs (tar+gzip -> AES-256-GCM) e tem o nome
// <timestamp>.uploads.tar.gz.enc. Antes de extrair, é criado um snapshot cifrado
// dos anexos ATUAIS em /backups/pre-restore/ (mesmo formato), para permitir
// reverter. A extração sobrescreve arquivos de mesmo nome no destino.
//
// Uso: node uploads-restore.mjs <arquivo.uploads.tar.gz.enc>
//   Ex.: node uploads-restore.mjs sistema_votacao_20261120_120000.uploads.tar.gz.enc
//
// Se o arquivo não existir localmente e BACKUP_S3_BUCKET estiver definida, ele é
// baixado do S3 (com o .meta.json correspondente, quando disponível).
//
// Variáveis: BACKUP_ENCRYPTION_KEY (obrigatória), UPLOADS_DIR (destino; padrão
//            /uploads), BACKUP_DIR (opcional, padrão /backups),
//            BACKUP_S3_BUCKET/BACKUP_S3_PREFIX (opcionais, para baixar do S3)

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { decryptBuffer, loadKey, metaPathFor, run, runUploadsBackup } from './db-backup.mjs'

async function downloadFromS3(filePath, fileName, dir) {
  const bucket = process.env.BACKUP_S3_BUCKET
  if (!bucket) return
  const prefix = (process.env.BACKUP_S3_PREFIX || 'backups').replace(/^\/+|\/+$/g, '')
  const base = path.basename(fileName)
  const key = prefix ? `${prefix}/${base}` : base
  const metaBase = path.basename(metaPathFor(base))
  const metaKey = prefix ? `${prefix}/${metaBase}` : metaBase

  await mkdir(dir, { recursive: true })
  console.log(`[restore:uploads] Arquivo não encontrado localmente; baixando s3://${bucket}/${key}...`)
  await run('aws', ['s3', 'cp', `s3://${bucket}/${key}`, filePath], process.env)
  try {
    await run('aws', ['s3', 'cp', `s3://${bucket}/${metaKey}`, metaPathFor(filePath)], process.env)
  } catch {
    console.warn('[restore:uploads] .meta.json não disponível no S3; seguindo sem verificação de sha256.')
  }
}

async function verifyIntegrity(filePath, payload) {
  let meta
  try {
    meta = JSON.parse(await readFile(metaPathFor(filePath), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('[restore:uploads] .meta.json não encontrado; pulando verificação de sha256.')
      return
    }
    throw error
  }
  if (meta.sha256) {
    const sha256 = createHash('sha256').update(payload).digest('hex')
    if (sha256 !== meta.sha256) {
      throw new Error('sha256 do arquivo não confere com o .meta.json (arquivo corrompido).')
    }
    console.log('[restore:uploads] Integridade verificada (sha256).')
  }
}

async function main() {
  const fileName = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  if (!fileName) {
    console.error('Uso: node uploads-restore.mjs <arquivo.uploads.tar.gz.enc>')
    process.exit(1)
  }

  const uploadsDir = process.env.UPLOADS_DIR || '/uploads'
  const dir = process.env.BACKUP_DIR || '/backups'
  const filePath = path.isAbsolute(fileName) ? fileName : path.join(dir, fileName)
  const key = loadKey()

  if (!existsSync(filePath)) {
    await downloadFromS3(filePath, fileName, dir)
  }

  const payload = await readFile(filePath)
  await verifyIntegrity(filePath, payload)
  const archive = decryptBuffer(payload, key)
  console.log(`[restore:uploads] Backup decifrado (${archive.length} bytes).`)

  const snapshot = await runUploadsBackup({ subdir: 'pre-restore' })
  if (snapshot) {
    console.log(`[restore:uploads] Snapshot dos anexos atuais salvo em ${snapshot}`)
  }

  await mkdir(uploadsDir, { recursive: true })
  const tmp = path.join(dir, `.restore-uploads-${Date.now()}.tar.gz`)
  await writeFile(tmp, archive)
  try {
    console.log(`[restore:uploads] Extraindo anexos em ${uploadsDir}...`)
    await run('tar', ['-xzf', tmp, '-C', uploadsDir], process.env)
    console.log('[restore:uploads] Anexos restaurados com sucesso.')
  } finally {
    await unlink(tmp).catch(() => {})
  }
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  main().catch((error) => {
    console.error(`[restore:uploads] ERRO: ${error.message}`)
    process.exit(1)
  })
}
