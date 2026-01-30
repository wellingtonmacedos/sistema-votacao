
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin ou presidente
    if (session.user.role !== 'ADMIN' && session.user.role !== 'PRESIDENT') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { action, type, itemId } = await request.json()

    if (action === 'start') {
      if (type === 'matter') {
        // Iniciar votação de uma matéria
        const matter = await prisma.matter.findUnique({
          where: { id: itemId }
        })

        if (!matter) {
          return NextResponse.json({ error: 'Matéria não encontrada' }, { status: 404 })
        }

        // Verificar se não há outra votação ativa
        const activeVoting = await prisma.matter.findFirst({
          where: { status: 'VOTING' }
        })

        if (activeVoting && activeVoting.id !== itemId) {
          return NextResponse.json({ error: 'Já existe uma votação ativa' }, { status: 400 })
        }

        // Iniciar votação da matéria
        const updatedMatter = await prisma.matter.update({
          where: { id: itemId },
          data: { status: 'VOTING' }
        })

        return NextResponse.json({
          message: 'Votação iniciada com sucesso',
          matter: updatedMatter
        })

      } else if (type === 'document') {
        // Iniciar votação de um documento
        const document = await prisma.document.findUnique({
          where: { id: itemId },
          include: { session: true }
        })

        if (!document) {
          return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
        }

        // Verificar se não há outro documento sendo votado
        const activeDocumentVoting = await prisma.document.findFirst({
          where: { 
            sessionId: document.sessionId,
            isVoting: true
          }
        })

        if (activeDocumentVoting && activeDocumentVoting.id !== itemId) {
          return NextResponse.json({ error: 'Já existe uma votação de documento ativa' }, { status: 400 })
        }

        // Parar votação de todos os outros documentos da sessão
        await prisma.document.updateMany({
          where: { sessionId: document.sessionId },
          data: { isVoting: false }
        })

        // Marcar documento como em votação
        const updatedDocument = await prisma.document.update({
          where: { id: itemId },
          data: { 
            isApproved: null,
            isVoting: true 
          }
        })

        // Limpar votos anteriores se existirem
        await prisma.documentVote.deleteMany({
          where: { documentId: itemId }
        })

        return NextResponse.json({
          message: 'Votação de documento iniciada com sucesso',
          document: updatedDocument
        })
      }

    } else if (action === 'end') {
      if (type === 'matter') {
        // Finalizar votação de matéria e calcular resultado
        const matter = await prisma.matter.findUnique({
          where: { id: itemId },
          include: {
            votes: {
              include: { user: true }
            }
          }
        })

        if (!matter) {
          return NextResponse.json({ error: 'Matéria não encontrada' }, { status: 404 })
        }

        // Calcular resultado
        const yesVotes = matter.votes.filter((v: any) => v.voteType === 'YES').length
        const noVotes = matter.votes.filter((v: any) => v.voteType === 'NO').length
        const abstentions = matter.votes.filter((v: any) => v.voteType === 'ABSTENTION').length

        let newStatus: 'APPROVED' | 'REJECTED' | 'ABSTAINED'
        
        if (yesVotes > noVotes && yesVotes > abstentions) {
          newStatus = 'APPROVED'
        } else if (noVotes > yesVotes) {
          newStatus = 'REJECTED'
        } else {
          newStatus = 'ABSTAINED'
        }

        const updatedMatter = await prisma.matter.update({
          where: { id: itemId },
          data: { status: newStatus }
        })

        return NextResponse.json({
          message: 'Votação finalizada',
          matter: updatedMatter,
          results: {
            yes: yesVotes,
            no: noVotes,
            abstention: abstentions,
            status: newStatus
          }
        })

      } else if (type === 'document') {
        // Finalizar votação de documento
        const document = await prisma.document.findUnique({
          where: { id: itemId },
          include: {
            votes: true
          }
        })

        if (!document) {
          return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
        }

        // Calcular resultado
        const yesVotes = document.votes.filter((v: any) => v.voteType === 'YES').length
        const noVotes = document.votes.filter((v: any) => v.voteType === 'NO').length

        const isApproved = yesVotes > noVotes

        const updatedDocument = await prisma.document.update({
          where: { id: itemId },
          data: { 
            isApproved,
            isVoting: false 
          }
        })

        return NextResponse.json({
          message: 'Votação de documento finalizada',
          document: updatedDocument,
          results: {
            yes: yesVotes,
            no: noVotes,
            approved: isApproved
          }
        })
      }
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

  } catch (error) {
    console.error('Erro na API de votação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Buscar votação ativa
export async function GET() {
  try {
    // Buscar matéria em votação
    const activeMatterVoting = await prisma.matter.findFirst({
      where: { status: 'VOTING' },
      include: {
        votes: {
          include: { user: true }
        },
        creator: true
      }
    })

    // Buscar documento em votação
    const activeDocumentVoting = await prisma.document.findFirst({
      where: { 
        isVoting: true
      },
      include: {
        votes: true,
        creator: true,
        session: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    let activeVoting = null

    if (activeMatterVoting) {
      const yesVotes = activeMatterVoting.votes.filter((v: any) => v.voteType === 'YES').length
      const noVotes = activeMatterVoting.votes.filter((v: any) => v.voteType === 'NO').length
      const abstentions = activeMatterVoting.votes.filter((v: any) => v.voteType === 'ABSTENTION').length
      
      // Buscar total de vereadores presentes na sessão atual
      const currentSession = await prisma.votingSession.findFirst({
        where: { status: { not: 'SCHEDULED' } },
        include: {
          attendances: {
            where: { isPresent: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      activeVoting = {
        type: 'matter',
        id: activeMatterVoting.id,
        title: activeMatterVoting.title,
        description: activeMatterVoting.description,
        votes: {
          yes: yesVotes,
          no: noVotes,
          abstention: abstentions
        },
        totalVoters: currentSession?.attendances.length || 0,
        isActive: true
      }
    } else if (activeDocumentVoting) {
      const yesVotes = activeDocumentVoting.votes.filter((v: any) => v.voteType === 'YES').length
      const noVotes = activeDocumentVoting.votes.filter((v: any) => v.voteType === 'NO').length
      
      // Buscar total de vereadores presentes na sessão
      const sessionAttendances = await prisma.attendance.count({
        where: { 
          sessionId: activeDocumentVoting.sessionId,
          isPresent: true 
        }
      })

      activeVoting = {
        type: 'document',
        id: activeDocumentVoting.id,
        title: activeDocumentVoting.title,
        description: activeDocumentVoting.description || '',
        documentType: activeDocumentVoting.type,
        author: activeDocumentVoting.author || '',
        votes: {
          yes: yesVotes,
          no: noVotes,
          abstention: 0
        },
        totalVoters: sessionAttendances,
        isActive: true
      }
    }

    return NextResponse.json({ activeVoting })

  } catch (error) {
    console.error('Erro ao buscar votação ativa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
