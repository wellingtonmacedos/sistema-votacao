import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parsePhaseInput } from '../validation'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data, error } = parsePhaseInput(await request.json())
    if (!data) return NextResponse.json({ error }, { status: 400 })

    const existing = await prisma.phaseDefinition.findUnique({ where: { id: params.id } })
    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: 'Fase não encontrada' }, { status: 404 })
    }

    const phase = await prisma.$transaction(async (tx) => {
      if (data.isVotingAgenda) {
        await tx.phaseDefinition.updateMany({
          where: { isVotingAgenda: true, id: { not: params.id } },
          data: { isVotingAgenda: false },
        })
      }
      return tx.phaseDefinition.update({ where: { id: params.id }, data })
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PHASE_UPDATE',
        details: JSON.stringify({ key: phase.key, before: existing, after: data }),
      },
    })

    return NextResponse.json(phase)
  } catch (error) {
    console.error('Erro ao atualizar fase:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Exclui a fase. Se ela já foi usada (sessões, histórico ou documentos), é apenas desativada para preservar o histórico.
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const phase = await prisma.phaseDefinition.findUnique({ where: { id: params.id } })
    if (!phase || !phase.isActive) {
      return NextResponse.json({ error: 'Fase não encontrada' }, { status: 404 })
    }

    const activeSession = await prisma.votingSession.findFirst({
      where: { status: phase.key },
      select: { id: true },
    })
    if (activeSession) {
      return NextResponse.json(
        { error: 'Esta fase está em andamento em uma sessão. Mude a sessão para outra fase antes de excluir.' },
        { status: 409 }
      )
    }

    const remaining = await prisma.phaseDefinition.count({ where: { isActive: true, id: { not: phase.id } } })
    if (remaining === 0) {
      return NextResponse.json({ error: 'É necessário manter pelo menos uma fase.' }, { status: 409 })
    }

    const [documents, history] = await Promise.all([
      prisma.document.count({ where: { phase: phase.key } }),
      prisma.sessionPhase.count({ where: { phase: phase.key } }),
    ])
    const inUse = documents + history > 0

    if (inUse) {
      await prisma.phaseDefinition.update({ where: { id: phase.id }, data: { isActive: false } })
    } else {
      await prisma.phaseDefinition.delete({ where: { id: phase.id } })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PHASE_DELETE',
        details: JSON.stringify({ key: phase.key, name: phase.name, archived: inUse }),
      },
    })

    return NextResponse.json({ success: true, archived: inUse })
  } catch (error) {
    console.error('Erro ao excluir fase:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
