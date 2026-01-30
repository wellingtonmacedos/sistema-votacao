
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { sessionId, action, duration, phase } = await request.json()

    if (action === 'start') {
      // Iniciar timer
      await prisma.votingSession.update({
        where: { id: sessionId },
        data: {
          timerStartedAt: new Date(),
          timerDuration: duration,
          timerPhase: phase
        }
      })
    } else if (action === 'stop') {
      // Parar timer
      await prisma.votingSession.update({
        where: { id: sessionId },
        data: {
          timerStartedAt: null,
          timerDuration: null,
          timerPhase: null
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao controlar timer:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
