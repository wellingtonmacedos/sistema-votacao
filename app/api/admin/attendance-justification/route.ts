import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { sessionId, userId, justification } = await request.json()

    if (!sessionId || !userId || typeof justification !== 'string' || !justification.trim()) {
      return NextResponse.json({ error: 'Sessão, vereador e justificativa são obrigatórios' }, { status: 400 })
    }

    const trimmedJustification = justification.trim()

    if (trimmedJustification.length > 500) {
      return NextResponse.json({ error: 'A justificativa deve ter no máximo 500 caracteres' }, { status: 400 })
    }

    const votingSession = await prisma.votingSession.findUnique({
      where: { id: sessionId }
    })

    if (!votingSession) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    if (!votingSession.isAttendanceOpen) {
      return NextResponse.json({ error: 'A justificativa só pode ser registrada com a chamada aberta' }, { status: 400 })
    }

    const attendance = await prisma.attendance.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId
        }
      }
    })

    if (!attendance) {
      return NextResponse.json({ error: 'Registro de presença não encontrado' }, { status: 404 })
    }

    if (attendance.isPresent) {
      return NextResponse.json({ error: 'Não é possível justificar falta de vereador presente' }, { status: 400 })
    }

    const updatedAttendance = await prisma.attendance.update({
      where: {
        sessionId_userId: {
          sessionId,
          userId
        }
      },
      data: {
        absenceJustification: trimmedJustification,
        absenceJustifiedAt: new Date(),
        absenceJustifiedBy: session.user.id
      }
    })

    return NextResponse.json({
      message: 'Falta justificada com sucesso',
      attendance: updatedAttendance
    })
  } catch (error) {
    console.error('Erro ao justificar falta:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const userId = searchParams.get('userId')

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'Sessão e vereador são obrigatórios' }, { status: 400 })
    }

    await prisma.attendance.update({
      where: {
        sessionId_userId: {
          sessionId,
          userId
        }
      },
      data: {
        absenceJustification: null,
        absenceJustifiedAt: null,
        absenceJustifiedBy: null
      }
    })

    return NextResponse.json({ message: 'Justificativa removida com sucesso' })
  } catch (error) {
    console.error('Erro ao remover justificativa:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
