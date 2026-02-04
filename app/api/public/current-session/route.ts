import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Buscar sessão ativa
    const currentSession = await prisma.votingSession.findFirst({
      where: {
        status: {
          not: 'CLOSED'
        }
      },
      orderBy: {
        date: 'desc'
      },
      include: {
        documents: {
          where: {
            isBeingRead: true
          }
        }
      }
    })

    if (!currentSession) {
      return NextResponse.json(null)
    }

    // Preparar dados do documento atual
    let currentDocument = null
    if (currentSession.documents.length > 0) {
      const doc = currentSession.documents[0]
      currentDocument = {
        id: doc.id,
        title: doc.title,
        type: doc.type,
        content: doc.content,
        author: doc.author
      }
    }

    // Preparar dados da votação atual
    let currentVoting = null
    
    // Buscar matéria em votação separadamente
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
            user: true
          }
        }
      }
    })
    
    if (votingMatter) {
      console.log('DEBUG: Found voting matter', votingMatter.id)
      console.log('DEBUG: Votes raw:', JSON.stringify(votingMatter.votes))
      const yesVotes = votingMatter.votes.filter((v: any) => v.voteType === 'YES').length
      const noVotes = votingMatter.votes.filter((v: any) => v.voteType === 'NO').length
      const abstentionVotes = votingMatter.votes.filter((v: any) => v.voteType === 'ABSTENTION').length
      console.log('DEBUG: Counts:', { yesVotes, noVotes, abstentionVotes })
      
      // Contar total de vereadores presentes
      const totalVoters = await prisma.attendance.count({
        where: {
          sessionId: currentSession.id,
          isPresent: true
        }
      })

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
        totalVoters,
        isActive: votingMatter.status === 'VOTING'
      }
    } else {
      // Buscar documento em votação
      const votingDocument = await prisma.document.findFirst({
        where: {
          sessionId: currentSession.id,
          isVoting: true
        },
        include: {
          votes: {
            include: {
              user: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (votingDocument) {
        console.log('DEBUG: Found voting document', votingDocument.id)
        console.log('DEBUG: Doc Votes raw:', JSON.stringify(votingDocument.votes))
        const yesVotes = votingDocument.votes.filter((v: any) => v.voteType === 'YES').length
        const noVotes = votingDocument.votes.filter((v: any) => v.voteType === 'NO').length
        const abstentionVotes = votingDocument.votes.filter((v: any) => v.voteType === 'ABSTENTION').length
        
        // Contar total de vereadores presentes
        const totalVoters = await prisma.attendance.count({
          where: {
            sessionId: currentSession.id,
            isPresent: true
          }
        })

        currentVoting = {
          type: 'document',
          id: votingDocument.id,
          title: votingDocument.title,
          description: votingDocument.description || '',
          documentType: votingDocument.type,
          author: votingDocument.author || '',
          votes: {
            yes: yesVotes,
            no: noVotes,
            abstention: abstentionVotes
          },
          totalVoters,
          isActive: true
        }
      }
    }

    // Timer real baseado nos campos do banco de dados
    let timer = null
    if (currentSession.timerStartedAt && currentSession.timerDuration && currentSession.timerPhase) {
      const now = new Date()
      const startTime = new Date(currentSession.timerStartedAt)
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      const timeRemaining = Math.max(0, currentSession.timerDuration - elapsed)
      
      if (timeRemaining > 0) {
        timer = {
          isActive: true,
          timeRemaining,
          phase: currentSession.timerPhase
        }
      }
    }

    const responseData = {
      id: currentSession.id,
      sessionNumber: currentSession.sessionNumber,
      date: currentSession.date,
      status: currentSession.status,
      currentDocument,
      currentVoting,
      timer
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Erro ao buscar sessão atual:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
