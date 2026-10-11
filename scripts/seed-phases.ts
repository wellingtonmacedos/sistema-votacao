import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'file:./dev.db',
})

const DEFAULT_PHASES = [
  { name: 'Agendada', phaseKey: 'SCHEDULED', orderIndex: 0, color: '#3b82f6', isDefault: true },
  { name: 'Pequeno Expediente', phaseKey: 'PEQUENO_EXPEDIENTE', orderIndex: 1, color: '#eab308', isDefault: true },
  { name: 'Grande Expediente', phaseKey: 'GRANDE_EXPEDIENTE', orderIndex: 2, color: '#f97316', isDefault: true },
  { name: 'Ordem do Dia', phaseKey: 'ORDEM_DO_DIA', orderIndex: 3, color: '#a855f7', isDefault: true },
  { name: 'Considerações Finais', phaseKey: 'CONSIDERACOES_FINAIS', orderIndex: 4, color: '#6366f1', isDefault: true },
  { name: 'Tribuna Livre', phaseKey: 'TRIBUNA_LIVE', orderIndex: 5, color: '#ec4899', isDefault: true },
  { name: 'Encerrada', phaseKey: 'CLOSED', orderIndex: 6, color: '#6b7280', isDefault: true },
]

async function main() {
  console.log('Populando fases padrão...')

  for (const p of DEFAULT_PHASES) {
    const existing = await prisma.phase.findFirst({
      where: { name: p.name, isDefault: true }
    })

    if (!existing) {
      await prisma.phase.create({
        data: {
          name: p.name,
          orderIndex: p.orderIndex,
          color: p.color,
          isDefault: p.isDefault,
          isActive: true
        }
      })
      console.log(`  ✓ Fase criada: ${p.name}`)
    } else {
      console.log(`  - Fase já existe: ${p.name}`)
    }
  }

  const total = await prisma.phase.count()
  console.log(`\nTotal de fases no banco: ${total}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
