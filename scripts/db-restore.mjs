#!/usr/bin/env node
// Restauração de um backup criptografado do PostgreSQL.
//
// Antes de restaurar, gera automaticamente um snapshot do banco ATUAL em
// /backups/pre-restore/ (mesmo formato criptografado), para permitir reverter.
//
// Uso: node db-restore.mjs <arquivo.dump.enc>
//   Ex.: node db-restore.mjs sistema_votacao_20261120_120000.dump.enc
//
// Variáveis: DATABASE_URL, BACKUP_ENCRYPTION_KEY, BACKUP_DIR (opcional)

import { createHash } from 'node:crypto'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { dbEnv, decryptBuffer, loadKey, run, runBackup } from './db-backup.mjs'

async function verifyIntegrity(filePath, payload) {
  const metaPath = filePath.replace(/\.dump\.enc$/, '.meta.json')
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
