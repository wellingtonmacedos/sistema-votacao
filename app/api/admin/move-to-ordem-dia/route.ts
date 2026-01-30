import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissão
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Apenas ADMIN e PRESIDENT podem mover documentos
    if (session.user.role !== 'ADMIN' && session.user.role !== 'PRESIDENT') {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      )
    }

    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'ID do documento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o documento existe
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    // Mover documento para Ordem do Dia
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        isOrdemDoDia: true,
        // Resetar estados de leitura/votação ao mover
        isBeingRead: false,
        isVoting: false,
        // Resetar resultado de votação anterior (null = não votado)
        isApproved: null
      },
      include: {
        creator: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      document: updatedDocument,
      message: 'Documento movido para Ordem do Dia com sucesso'
    })
  } catch (error) {
    console.error('Erro ao mover documento para Ordem do Dia:', error)
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    )
  }
}

// API para remover documento da Ordem do Dia
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'PRESIDENT') {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      )
    }

    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'ID do documento é obrigatório' },
        { status: 400 }
      )
    }

    // Remover documento da Ordem do Dia e resetar status de votação
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        isOrdemDoDia: false,
        isBeingRead: false,
        isVoting: false,
        isApproved: null // Resetar resultado de votação
      }
    })

    return NextResponse.json({
      success: true,
      document: updatedDocument,
      message: 'Documento removido da Ordem do Dia'
    })
  } catch (error) {
    console.error('Erro ao remover documento da Ordem do Dia:', error)
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    )
  }
}
