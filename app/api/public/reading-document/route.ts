import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Buscar sessão ativa primeiro
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
      return NextResponse.json({ document: null })
    }

    // Buscar o documento que está sendo lido
    const readingDocument = await prisma.document.findFirst({
      where: {
        isBeingRead: true,
        sessionId: currentSession.id
      },
      include: {
        creator: {
          select: {
            fullName: true,
            role: true
          }
        }
      }
    })

    // Retornar resposta sem cache
    return NextResponse.json(
      { document: readingDocument },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    console.error('Erro ao buscar documento em leitura:', error)
    return NextResponse.json({ document: null }, { status: 500 })
  }
}
