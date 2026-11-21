import { afterEach, describe, expect, it } from 'vitest'
import { dbEnv, decryptBuffer, encryptBuffer, loadKey, metaPathFor } from './db-backup.mjs'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('metaPathFor', () => {
  it('mantém o padrão .meta.json dos dumps (compatível com backups antigos)', () => {
    expect(metaPathFor('/backups/sistema_votacao_1.dump.enc')).toBe(
      '/backups/sistema_votacao_1.meta.json'
    )
  })

  it('gera um .meta.json próprio para o arquivo de anexos', () => {
    expect(metaPathFor('/backups/sistema_votacao_1.uploads.tar.gz.enc')).toBe(
      '/backups/sistema_votacao_1.uploads.tar.gz.meta.json'
    )
  })
})

describe('encryptBuffer/decryptBuffer', () => {
  const key = Buffer.alloc(32, 3)

  it('faz o round-trip preservando o conteúdo', () => {
    const plain = Buffer.from('anexos de teste — ção')
    const enc = encryptBuffer(plain, key)
    expect(enc.subarray(0, 4).toString()).toBe('SVB1')
    expect(decryptBuffer(enc, key).toString()).toBe('anexos de teste — ção')
  })

  it('rejeita chave incorreta (falha na autenticação GCM)', () => {
    const enc = encryptBuffer(Buffer.from('x'), key)
    expect(() => decryptBuffer(enc, Buffer.alloc(32, 9))).toThrow()
  })

  it('rejeita payload truncado', () => {
    expect(() => decryptBuffer(Buffer.from('SVB1'), key)).toThrow(/truncado/i)
  })

  it('rejeita arquivo que não é um backup do sistema (magic inválido)', () => {
    expect(() => decryptBuffer(Buffer.alloc(64, 9), key)).toThrow(/magic/i)
  })
})

describe('loadKey', () => {
  it('exige a variável BACKUP_ENCRYPTION_KEY', () => {
    delete process.env.BACKUP_ENCRYPTION_KEY
    expect(() => loadKey()).toThrow(/BACKUP_ENCRYPTION_KEY/)
  })

  it('aceita 32 bytes em base64', () => {
    process.env.BACKUP_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString('base64')
    expect(loadKey().length).toBe(32)
  })

  it('aceita 64 caracteres hexadecimais', () => {
    process.env.BACKUP_ENCRYPTION_KEY = 'ab'.repeat(32)
    expect(loadKey().length).toBe(32)
  })

  it('rejeita chave com tamanho inválido', () => {
    process.env.BACKUP_ENCRYPTION_KEY = Buffer.alloc(16, 5).toString('base64')
    expect(() => loadKey()).toThrow(/32 bytes/)
  })
})

describe('dbEnv', () => {
  it('converte a DATABASE_URL em variáveis do libpq, ignorando ?schema=', () => {
    process.env.DATABASE_URL =
      'postgresql://usuario:senha%40forte@127.0.0.1:5433/meu_banco?schema=public'
    const env = dbEnv()
    expect(env.PGHOST).toBe('127.0.0.1')
    expect(env.PGPORT).toBe('5433')
    expect(env.PGUSER).toBe('usuario')
    expect(env.PGPASSWORD).toBe('senha@forte')
    expect(env.PGDATABASE).toBe('meu_banco')
  })

  it('usa 5432 quando a porta não é informada', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost/banco'
    expect(dbEnv().PGPORT).toBe('5432')
  })

  it('exige a DATABASE_URL', () => {
    delete process.env.DATABASE_URL
    expect(() => dbEnv()).toThrow(/DATABASE_URL/)
  })
})
