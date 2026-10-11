
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

const VALID_STATUSES = [
  'SCHEDULED',
  'PEQUENO_EXPEDIENTE',
  'GRANDE_EXPEDIENTE',
  'ORDEM_DO_DIA',
  'CONSIDERACOES_FINAIS',
  'TRIBUNA_LIVE',
  'CLOSED'
]

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { status } = await request.json()

    if (!status) {
      return NextResponse.json({ error: 'Status é obrigatório' }, { status: 400 })
    }

    // Buscar sessão ativa
    const currentSession = await prisma.votingSession.findFirst({
      where: {
        status: {
          not: 'CLOSED'
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    if (!currentSession) {
      return NextResponse.json({ error: 'Nenhuma sessão ativa encontrada' }, { status: 404 })
    }

    const now = new Date()
    const isStandardStatus = VALID_STATUSES.includes(status)

    if (currentSession.currentPhase !== status) {
      // Fechar a fase atual aberta
      const openPhase = await prisma.sessionPhase.findFirst({
        where: { sessionId: currentSession.id, endedAt: null },
        orderBy: { startedAt: 'desc' }
      })
      if (openPhase && openPhase.phase !== status) {
        await prisma.sessionPhase.update({
          where: { id: openPhase.id },
          data: { endedAt: now }
        })
      }

      // Criar nova fase (se não houver uma aberta para ela)
      const targetPhaseExisting = await prisma.sessionPhase.findFirst({
        where: { sessionId: currentSession.id, phase: status },
        orderBy: { startedAt: 'desc' }
      })

      const isClosed = status === 'CLOSED'
      if (!targetPhaseExisting || targetPhaseExisting.endedAt !== null) {
        await prisma.sessionPhase.create({
          data: {
            sessionId: currentSession.id,
            phase: status,
            startedAt: now,
            endedAt: isClosed ? now : null
          }
        })
      } else if (!targetPhaseExisting.endedAt && isClosed) {
        await prisma.sessionPhase.update({
          where: { id: targetPhaseExisting.id },
          data: { endedAt: now }
        })
      }
    }

    // Atualizar sessão
    const updateData: Prisma.VotingSessionUpdateInput = {
      currentPhase: status,
      startedAt: status !== 'SCHEDULED' && !currentSession.startedAt ? now : currentSession.startedAt,
      endedAt: status === 'CLOSED' ? now : null
    }

    // Só atualiza o enum status se for um status padrão válido
    if (isStandardStatus) {
      updateData.status = status
    }

    await prisma.votingSession.update({
      where: { id: currentSession.id },
      data: updateData
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar status da sessão:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
