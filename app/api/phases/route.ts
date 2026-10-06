import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { listPhases } from '@/lib/phases-server'
import { parsePhaseInput, phaseKeyFromName } from './validation'

export const dynamic = 'force-dynamic'

// Lista todas as fases (inclusive excluídas, para exibir nomes no histórico)
export async function GET() {
  try {
    return NextResponse.json(await listPhases())
  } catch (error) {
    console.error('Erro ao listar fases:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data, error } = parsePhaseInput(await request.json())
    if (!data) return NextResponse.json({ error }, { status: 400 })

    const last = await prisma.phaseDefinition.findFirst({
      where: { isActive: true },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    })

    const phase = await prisma.$transaction(async (tx) => {
      if (data.isVotingAgenda) {
        await tx.phaseDefinition.updateMany({ where: { isVotingAgenda: true }, data: { isVotingAgenda: false } })
      }
      return tx.phaseDefinition.create({
        data: { ...data, key: phaseKeyFromName(data.name), orderIndex: (last?.orderIndex ?? 0) + 1 },
      })
    })

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: 'PHASE_CREATE', details: JSON.stringify({ key: phase.key, name: phase.name }) },
    })

    return NextResponse.json(phase, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar fase:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
