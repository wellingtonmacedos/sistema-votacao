// Copia todos os dados de um banco SQLite (Prisma) para o Postgres apontado por DATABASE_URL.
// Uso: node --env-file=.env scripts/copy-sqlite-to-postgres.mjs [caminho/do/dev.db]
// Requer Node >= 22.5 (node:sqlite) e o banco de destino vazio com as migrations aplicadas.
import { DatabaseSync } from 'node:sqlite'
import prismaPkg from '@prisma/client'

const { PrismaClient, Prisma } = prismaPkg

const sqlitePath = process.argv[2] ?? 'prisma/dev.db'
const models = Prisma.dmmf.datamodel.models

const delegateName = (model) => model.name[0].toLowerCase() + model.name.slice(1)
const tableName = (model) => model.dbName ?? model.name
const columnName = (field) => field.dbName ?? field.name
const scalarFields = (model) => model.fields.filter((f) => f.kind === 'scalar' || f.kind === 'enum')
const keyFields = (model) => {
  const ids = model.fields.filter((f) => f.isId)
  return ids.length > 0 ? ids : model.fields.filter((f) => f.isUnique)
}

function orderByDependencies(allModels) {
  const ordered = []
  const visited = new Set()
  const byName = new Map(allModels.map((m) => [m.name, m]))
  const visit = (model) => {
    if (visited.has(model.name)) return
    visited.add(model.name)
    for (const field of model.fields) {
      if (field.kind === 'object' && field.relationFromFields?.length && field.type !== model.name) {
        visit(byName.get(field.type))
      }
    }
    ordered.push(model)
  }
  allModels.forEach(visit)
  return ordered
}

function convert(value, field) {
  if (value === null || value === undefined) return null
  switch (field.type) {
    case 'DateTime':
      return new Date(typeof value === 'string' && !/^\d+$/.test(value) ? value : Number(value))
    case 'Boolean':
      return value === 1 || value === 1n || value === true || value === '1' || value === 'true'
    case 'Int':
    case 'Float':
      return Number(value)
    default:
      return value
  }
}

function normalize(value) {
  return value instanceof Date ? value.toISOString() : value
}

function rowKey(row, model) {
  return JSON.stringify(keyFields(model).map((f) => row[f.name]))
}

function rowSignature(row, model) {
  return JSON.stringify(scalarFields(model).map((f) => normalize(row[f.name] ?? null)))
}

function readSqliteRows(sqlite, model) {
  const fields = scalarFields(model)
  const rows = sqlite.prepare(`SELECT * FROM "${tableName(model)}"`).all()
  return rows.map((row) => Object.fromEntries(fields.map((f) => [f.name, convert(row[columnName(f)], f)])))
}

async function main() {
  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true })
  const prisma = new PrismaClient()
  const ordered = orderByDependencies(models)

  try {
    for (const model of ordered) {
      const existing = await prisma[delegateName(model)].count()
      if (existing > 0) {
        throw new Error(`Banco de destino não está vazio (${tableName(model)} tem ${existing} registros). Nada foi copiado.`)
      }
    }

    const source = new Map(ordered.map((model) => [model.name, readSqliteRows(sqlite, model)]))

    await prisma.$transaction(
      async (tx) => {
        for (const model of ordered) {
          const data = source.get(model.name)
          if (data.length > 0) await tx[delegateName(model)].createMany({ data })
        }
      },
      { timeout: 300_000, maxWait: 30_000 }
    )

    let ok = true
    console.log('Tabela'.padEnd(24), 'SQLite'.padStart(8), 'Postgres'.padStart(9), ' Conteúdo')
    for (const model of ordered) {
      const expected = source.get(model.name)
      const copied = await prisma[delegateName(model)].findMany()
      const copiedByKey = new Map(copied.map((row) => [rowKey(row, model), rowSignature(row, model)]))
      const identical =
        copied.length === expected.length &&
        expected.every((row) => copiedByKey.get(rowKey(row, model)) === rowSignature(row, model))
      ok &&= identical
      console.log(
        tableName(model).padEnd(24),
        String(expected.length).padStart(8),
        String(copied.length).padStart(9),
        identical ? ' idêntico' : ' DIFERENTE'
      )
    }

    if (!ok) throw new Error('Divergência entre origem e destino após a cópia.')
    console.log(`\nCópia concluída: ${sqlitePath} -> Postgres.`)
  } finally {
    sqlite.close()
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error.message ?? error)
  process.exit(1)
})
