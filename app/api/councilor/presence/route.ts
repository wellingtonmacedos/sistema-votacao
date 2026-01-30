import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST - Registrar presença do vereador
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'COUNCILOR') {
      return NextResponse.json({ error: 'Apenas vereadores podem registrar presença' }, { status: 403 })
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

    if (!currentSession.isAttendanceOpen) {
      return NextResponse.json({ error: 'A chamada de presença não está aberta' }, { status: 400 })
    }

    // Verificar se já registrou presença
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        sessionId_userId: {
          sessionId: currentSession.id,
          userId: session.user.id
        }
      }
    })

    if (existingAttendance?.isPresent) {
      return NextResponse.json({ error: 'Presença já registrada' }, { status: 400 })
    }

    // Registrar presença
    const attendance = await prisma.attendance.upsert({
      where: {
        sessionId_userId: {
          sessionId: currentSession.id,
          userId: session.user.id
        }
      },
      update: {
        isPresent: true,
        arrivedAt: new Date()
      },
      create: {
        sessionId: currentSession.id,
        userId: session.user.id,
        isPresent: true,
        arrivedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Presença registrada com sucesso',
      arrivedAt: attendance.arrivedAt
    })

  } catch (error) {
    console.error('Erro ao registrar presença:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
