
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { deleteFile, getFileUrl } from "@/lib/s3"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar se é admin
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const data = await request.json()
    const {
      title,
      type,
      content,
      author,
      sessionId,
      phase,
      attachmentName,
      attachmentPath,
      attachmentUrl,
      attachmentMimeType
    } = data

    // Validação básica
    if (!title || !type || !sessionId) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: title, type e sessionId' 
      }, { status: 400 })
    }

    const trimmedContent = typeof content === 'string' ? content.trim() : ''
    const hasAttachment =
      Boolean(attachmentName) ||
      Boolean(attachmentPath) ||
      Boolean(attachmentUrl) ||
      Boolean(attachmentMimeType)

    if (!trimmedContent && !hasAttachment) {
      return NextResponse.json({
        error: 'Informe o conteúdo do documento ou anexe um PDF'
      }, { status: 400 })
    }

    if (hasAttachment) {
      const isValidAttachment =
        typeof attachmentName === 'string' &&
        typeof attachmentPath === 'string' &&
        typeof attachmentUrl === 'string' &&
        typeof attachmentMimeType === 'string' &&
        attachmentMimeType === 'application/pdf' &&
        attachmentName.toLowerCase().endsWith('.pdf') &&
        attachmentPath.toLowerCase().endsWith('.pdf') &&
        /^[a-zA-Z0-9._/-]+$/.test(attachmentPath) &&
        attachmentUrl === getFileUrl(attachmentPath, true)

      if (!isValidAttachment) {
        return NextResponse.json({
          error: 'Anexo PDF inválido'
        }, { status: 400 })
      }
    }

    // Verificar se a sessão de votação existe
    const existingSession = await prisma.votingSession.findUnique({
      where: { id: sessionId }
    })

    if (!existingSession) {
      return NextResponse.json({ 
        error: 'Sessão de votação não encontrada' 
      }, { status: 404 })
    }

    // Regra de Negócio: Documentos só podem ser criados se a sessão estiver ABERTA (não encerrada)
    if (existingSession.status === 'CLOSED') {
      return NextResponse.json({ 
        error: 'Não é possível adicionar documentos a uma sessão encerrada' 
      }, { status: 400 })
    }

    // Criar o documento
    const document = await prisma.document.create({
      data: {
        title,
        type,
        phase: phase || 'PEQUENO_EXPEDIENTE',
        content: trimmedContent || null,
        attachmentName: hasAttachment ? attachmentName : null,
        attachmentPath: hasAttachment ? attachmentPath : null,
        attachmentUrl: hasAttachment ? attachmentUrl : null,
        attachmentMimeType: hasAttachment ? attachmentMimeType : null,
        author: author || null,
        sessionId,
        createdBy: session.user.id,
        createdAt: new Date()
      },
      include: {
        creator: {
          select: {
            fullName: true
          }
        }
      }
    })

    console.log('📄 Novo documento criado:', {
      id: document.id,
      title: document.title,
      type: document.type,
      author: document.author,
      attachmentName: document.attachmentName,
      attachmentUrl: document.attachmentUrl,
      creator: document.creator.fullName
    })

    return NextResponse.json({ 
      message: 'Documento criado com sucesso',
      document: {
        id: document.id,
        title: document.title,
        type: document.type,
        author: document.author,
        attachmentName: document.attachmentName,
        attachmentUrl: document.attachmentUrl,
        creator: document.creator.fullName,
        createdAt: document.createdAt
      }
    })

  } catch (error) {
    console.error('❌ Erro ao criar documento:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor ao criar documento' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar se é admin
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const type = searchParams.get('type') || searchParams.get('phase')

    // Buscar documentos
    const whereClause: any = {}
    if (sessionId) whereClause.sessionId = sessionId
    if (type) whereClause.type = type

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          select: {
            title: true,
            sessionNumber: true
          }
        }
      }
    })

    return NextResponse.json(documents)

  } catch (error) {
    console.error('❌ Erro ao buscar documentos:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor ao buscar documentos' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Verificar se é admin
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ 
        error: 'ID do documento é obrigatório' 
      }, { status: 400 })
    }

    // Verificar se o documento existe
    const existingDocument = await prisma.document.findUnique({
      where: { id: documentId }
    })

    if (!existingDocument) {
      return NextResponse.json({ 
        error: 'Documento não encontrado' 
      }, { status: 404 })
    }

    if (existingDocument.attachmentPath) {
      await deleteFile(existingDocument.attachmentPath)
    }

    // Deletar o documento
    await prisma.document.delete({
      where: { id: documentId }
    })

    console.log('🗑️ Documento deletado:', {
      id: documentId,
      title: existingDocument.title
    })

    return NextResponse.json({ 
      message: 'Documento deletado com sucesso' 
    })

  } catch (error) {
    console.error('❌ Erro ao deletar documento:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor ao deletar documento' 
    }, { status: 500 })
  }
}
