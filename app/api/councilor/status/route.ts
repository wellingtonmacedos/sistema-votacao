import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Buscar status completo do vereador na sessão atual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'COUNCILOR') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar sessão ativa
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
      return NextResponse.json({
        hasActiveSession: false,
        session: null,
        presence: null,
        currentVoting: null,
        myVote: null,
        speechRequests: []
      })
    }

    // Verificar presença do vereador
    const attendance = await prisma.attendance.findUnique({
      where: {
        sessionId_userId: {
          sessionId: currentSession.id,
          userId: session.user.id
        }
      }
    })

    // Buscar documento em votação
    const votingDocument = await prisma.document.findFirst({
      where: {
        sessionId: currentSession.id,
        isVoting: true
      },
      include: {
        votes: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        }
      }
    })

    // Buscar matéria em votação
    const votingMatter = await prisma.matter.findFirst({
      where: {
        status: 'VOTING',
        sessions: {
          some: {
            sessionId: currentSession.id
          }
        }
      },
      include: {
        votes: {
          include: {
            user: {
              select: { id: true, fullName: true }
            }
          }
        }
      }
    })

    // Determinar votação atual e voto do usuário
    let currentVoting = null
    let myVote = null

    if (votingDocument) {
      const yesVotes = votingDocument.votes.filter((v: any) => v.voteType === 'YES').length
      const noVotes = votingDocument.votes.filter((v: any) => v.voteType === 'NO').length
      const abstentionVotes = votingDocument.votes.filter((v: any) => v.voteType === 'ABSTENTION').length
      
      const userVote = votingDocument.votes.find((v: any) => v.userId === session.user.id)
      myVote = userVote ? userVote.voteType : null

      currentVoting = {
        type: 'document',
        id: votingDocument.id,
        title: votingDocument.title,
        description: votingDocument.description || '',
        documentType: votingDocument.type,
        votes: {
          yes: yesVotes,
          no: noVotes,
          abstention: abstentionVotes
        },
        isActive: true
      }
    } else if (votingMatter) {
      const yesVotes = votingMatter.votes.filter((v: any) => v.voteType === 'YES').length
      const noVotes = votingMatter.votes.filter((v: any) => v.voteType === 'NO').length
      const abstentionVotes = votingMatter.votes.filter((v: any) => v.voteType === 'ABSTENTION').length
      
      const userVote = votingMatter.votes.find((v: any) => v.userId === session.user.id)
      myVote = userVote ? userVote.voteType : null

      currentVoting = {
        type: 'matter',
        id: votingMatter.id,
        title: votingMatter.title,
        description: votingMatter.description,
        votes: {
          yes: yesVotes,
          no: noVotes,
          abstention: abstentionVotes
        },
        isActive: votingMatter.status === 'VOTING'
      }
    }

    // Buscar solicitações de fala do vereador
    const speechRequests = await prisma.speechRequest.findMany({
      where: {
        sessionId: currentSession.id,
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Buscar total de solicitações de fala para calcular posição na fila
    const allSpeechRequests = await prisma.speechRequest.findMany({
      where: {
        sessionId: currentSession.id,
        type: 'CONSIDERACOES_FINAIS',
        isApproved: true,
        hasSpoken: false
      },
      orderBy: {
        orderIndex: 'asc'
      },
      select: {
        id: true,
        userId: true,
        isSpeaking: true
      }
    })

    // Calcular posição do vereador na fila
    let queuePosition = null
    const userRequestInQueue = allSpeechRequests.findIndex((req: any) => req.userId === session.user.id)
    if (userRequestInQueue !== -1) {
      queuePosition = userRequestInQueue + 1
    }

    // Contar presenças
    const attendanceCount = await prisma.attendance.count({
      where: {
        sessionId: currentSession.id,
        isPresent: true
      }
    })

    const totalCouncilors = await prisma.user.count({
      where: {
        role: 'COUNCILOR',
        isActive: true
      }
    })

    return NextResponse.json({
      hasActiveSession: true,
      session: {
        id: currentSession.id,
        sessionNumber: currentSession.sessionNumber,
        status: currentSession.status,
        date: currentSession.date,
        isAttendanceOpen: currentSession.isAttendanceOpen,
        isSpeechRequestsOpen: currentSession.isSpeechRequestsOpen,
        quorum: currentSession.quorum
      },
      presence: {
        isPresent: attendance?.isPresent || false,
        arrivedAt: attendance?.arrivedAt || null,
        presentCount: attendanceCount,
        totalCount: totalCouncilors,
        hasQuorum: attendanceCount >= currentSession.quorum
      },
      currentVoting,
      myVote,
      speechRequests: speechRequests.map((req: any) => ({
        id: req.id,
        subject: req.subject,
        type: req.type,
        isApproved: req.isApproved,
        hasSpoken: req.hasSpoken,
        isSpeaking: req.isSpeaking,
        createdAt: req.createdAt
      })),
      queuePosition
    })

  } catch (error) {
    console.error('Erro ao buscar status do vereador:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
