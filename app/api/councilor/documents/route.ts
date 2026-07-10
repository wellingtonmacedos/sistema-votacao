import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'COUNCILOR') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const currentSession = await prisma.votingSession.findFirst({
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

    if (!currentSession) {
      return NextResponse.json([])
    }

    const documents = await prisma.document.findMany({
      where: {
        sessionId: currentSession.id
      },
      orderBy: [
        { phase: 'asc' },
        { orderIndex: 'asc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        type: true,
        phase: true,
        author: true,
        content: true,
        attachmentName: true,
        attachmentUrl: true,
        attachmentMimeType: true,
        createdAt: true,
        creator: {
          select: {
            fullName: true
          }
        }
      }
    })

    return NextResponse.json(
      documents.map((document) => ({
        id: document.id,
        title: document.title,
        type: document.type,
        phase: document.phase,
        author: document.author || document.creator.fullName,
        content: document.content || '',
        attachmentName: document.attachmentName,
        attachmentUrl: document.attachmentUrl,
        attachmentMimeType: document.attachmentMimeType,
        createdAt: document.createdAt
      }))
    )
  } catch (error) {
    console.error('Erro ao buscar documentos do vereador:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
