
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

    const { status } = await request.json()

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

    // Atualizar status da sessão
    await prisma.votingSession.update({
      where: { id: currentSession.id },
      data: { 
        status: status,
        startedAt: status !== 'SCHEDULED' && !currentSession.startedAt ? new Date() : currentSession.startedAt,
        endedAt: status === 'CLOSED' ? new Date() : null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar status da sessão:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
