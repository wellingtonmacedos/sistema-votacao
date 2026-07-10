
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const VALID_VOTE_TYPES = ['YES', 'NO', 'ABSTENTION'] as const

// POST - Registrar voto de vereador
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'COUNCILOR') {
      return NextResponse.json({ error: 'Apenas vereadores podem votar' }, { status: 403 })
    }

    const { type, itemId, voteType } = await request.json()

    if (!type || !itemId || !voteType) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: type, itemId e voteType' }, { status: 400 })
    }

    if (!VALID_VOTE_TYPES.includes(voteType)) {
      return NextResponse.json({ error: 'Tipo de voto inválido' }, { status: 400 })
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
      return NextResponse.json({ error: 'Nenhuma sessão ativa encontrada' }, { status: 404 })
    }

    const attendance = await prisma.attendance.findUnique({
      where: {
        sessionId_userId: {
          sessionId: currentSession.id,
          userId: session.user.id
        }
      }
    })

    if (!attendance?.isPresent) {
      return NextResponse.json({ error: 'Apenas vereadores com presença registrada podem votar' }, { status: 403 })
    }

    if (type === 'matter') {
      // Votar em matéria
      const matter = await prisma.matter.findUnique({
        where: { id: itemId },
        include: {
          sessions: {
            where: {
              sessionId: currentSession.id
            },
            select: {
              sessionId: true
            }
          }
        }
      })

      if (!matter) {
        return NextResponse.json({ error: 'Matéria não encontrada' }, { status: 404 })
      }

      if (matter.sessions.length === 0) {
        return NextResponse.json({ error: 'Esta matéria não pertence à sessão ativa' }, { status: 400 })
      }

      if (matter.status !== 'VOTING') {
        return NextResponse.json({ error: 'Esta matéria não está em votação' }, { status: 400 })
      }

      // Verificar se o vereador já votou
      const existingVote = await prisma.vote.findUnique({
        where: {
          matterId_userId: {
            matterId: itemId,
            userId: session.user.id
          }
        }
      })

      if (existingVote) {
        return NextResponse.json({ error: 'Seu voto já foi registrado e não pode ser alterado' }, { status: 400 })
      }

      // Criar novo voto
      const vote = await prisma.vote.create({
        data: {
          matterId: itemId,
          userId: session.user.id,
          voteType
        }
      })

      return NextResponse.json({
        message: 'Voto registrado com sucesso',
        vote
      })

    } else if (type === 'document') {
      // Votar em documento
      const document = await prisma.document.findUnique({
        where: { id: itemId }
      })

      if (!document) {
        return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
      }

      if (document.sessionId !== currentSession.id) {
        return NextResponse.json({ error: 'Este documento não pertence à sessão ativa' }, { status: 400 })
      }

      if (!document.isVoting) {
        return NextResponse.json({ error: 'Este documento não está em votação' }, { status: 400 })
      }

      if (document.isApproved !== null) {
        return NextResponse.json({ error: 'Esta votação de documento já foi finalizada' }, { status: 400 })
      }

      // Verificar se o vereador já votou
      const existingVote = await prisma.documentVote.findUnique({
        where: {
          documentId_userId: {
            documentId: itemId,
            userId: session.user.id
          }
        }
      })

      if (existingVote) {
        return NextResponse.json({ error: 'Seu voto já foi registrado e não pode ser alterado' }, { status: 400 })
      }

      // Criar novo voto
      const vote = await prisma.documentVote.create({
        data: {
          documentId: itemId,
          userId: session.user.id,
          voteType
        }
      })

      return NextResponse.json({
        message: 'Voto registrado com sucesso',
        vote
      })
    }

    return NextResponse.json({ error: 'Tipo de votação inválido' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao registrar voto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Buscar votos de uma votação específica (para exibir no painel)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const itemId = url.searchParams.get('itemId')

    if (!type || !itemId) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: type e itemId' }, { status: 400 })
    }

    if (type === 'matter') {
      // Buscar votos da matéria com informações dos vereadores
      const votes = await prisma.vote.findMany({
        where: { matterId: itemId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              role: true,
            }
          }
        }
      })

      return NextResponse.json({ votes })

    } else if (type === 'document') {
      // Buscar votos do documento com informações dos vereadores
      const votes = await prisma.documentVote.findMany({
        where: { documentId: itemId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              role: true,
            }
          }
        }
      })

      return NextResponse.json({ votes })
    }

    return NextResponse.json({ error: 'Tipo de votação inválido' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao buscar votos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
