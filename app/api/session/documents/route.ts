import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    let currentSession;

    if (sessionId) {
      currentSession = await prisma.votingSession.findUnique({
        where: { id: sessionId }
      })
    } else {
      // Buscar sessão ativa padrão
      currentSession = await prisma.votingSession.findFirst({
        where: {
          status: {
            not: 'CLOSED'
          }
        },
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' }
        ]
      })
    }

    if (!currentSession) {
      return NextResponse.json([])
    }

    // Buscar todos os documentos da sessão
    const documents = await prisma.document.findMany({
      where: {
        sessionId: currentSession.id
      },
      orderBy: [
        { orderIndex: 'asc' },
        { createdAt: 'desc' }
      ],
      include: {
        creator: {
          select: {
            fullName: true
          }
        }
      }
    })

    const formattedDocuments = documents.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      phase: doc.phase,
      content: doc.content || '',
      author: doc.author || doc.creator?.fullName || 'Autor desconhecido',
      description: doc.description || '',
      isBeingRead: doc.isBeingRead,
      isVoting: doc.isVoting,
      isOrdemDoDia: doc.isOrdemDoDia,
      isApproved: doc.isApproved, // Campo de status de votação
      orderIndex: doc.orderIndex,
      createdAt: doc.createdAt
    }))

    return NextResponse.json(formattedDocuments, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Erro ao buscar documentos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
