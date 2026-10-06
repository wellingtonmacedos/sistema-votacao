import { prisma } from '@/lib/db'
import { SESSION_CLOSED, SESSION_SCHEDULED } from '@/lib/phases'

export const listPhases = () =>
  prisma.phaseDefinition.findMany({ orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }] })

export async function firstActivePhaseKey(): Promise<string | null> {
  const phase = await prisma.phaseDefinition.findFirst({
    where: { isActive: true },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    select: { key: true },
  })
  return phase?.key ?? null
}

export async function isValidSessionStatus(status: unknown): Promise<boolean> {
  if (typeof status !== 'string') return false
  if (status === SESSION_SCHEDULED || status === SESSION_CLOSED) return true
  const phase = await prisma.phaseDefinition.findUnique({ where: { key: status }, select: { isActive: true } })
  return phase?.isActive ?? false
}
