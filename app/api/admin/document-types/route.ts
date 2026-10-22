import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  createDocumentTypeSchema,
  parseBody,
  updateDocumentTypeSchema,
  ValidationError
} from '@/lib/validations'

const DEFAULT_DOCUMENT_TYPES = [
  { label: 'Ata Anterior', value: 'ATA_ANTERIOR', orderIndex: 0 },
  { label: 'Dispensa de Ata', value: 'DISPENSA_ATA', orderIndex: 1 },
  { label: 'Comunicado', value: 'COMUNICADO', orderIndex: 2 },
  { label: 'Ofício', value: 'OFICIO', orderIndex: 3 },
  { label: 'Requerimento', value: 'REQUERIMENTO', orderIndex: 4 },
  { label: 'Projeto', value: 'PROJETO', orderIndex: 5 },
  { label: 'Indicação', value: 'INDICACAO', orderIndex: 6 },
  { label: 'Moção', value: 'MOCAO', orderIndex: 7 }
]

async function ensureDefaultDocumentTypes() {
  const count = await prisma.documentType.count()

  if (count > 0) {
    return
  }

  await prisma.documentType.createMany({
    data: DEFAULT_DOCUMENT_TYPES.map((documentType) => ({
      ...documentType,
      isActive: true
    }))
  })
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin()
    if (authError) return authError

    await ensureDefaultDocumentTypes()

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const documentTypes = await prisma.documentType.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {})
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }]
    })

    return NextResponse.json(documentTypes)
  } catch (error) {
    console.error('Erro ao buscar tipos de documento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin()
    if (authError) return authError

    const body = await request.json()
    const data = parseBody(createDocumentTypeSchema, body)
    const normalizedValue = data.value.trim().toUpperCase()
    const normalizedLabel = data.label.trim()

    const nextOrder = typeof data.orderIndex === 'number'
      ? data.orderIndex
      : await prisma.documentType.count()

    const documentType = await prisma.documentType.create({
      data: {
        label: normalizedLabel,
        value: normalizedValue,
        orderIndex: nextOrder,
        isActive: typeof data.isActive === 'boolean' ? data.isActive : true
      }
    })

    return NextResponse.json(documentType)
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Já existe um tipo com esse código' },
        { status: 400 }
      )
    }

    console.error('Erro ao criar tipo de documento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireAdmin()
    if (authError) return authError

    const body = await request.json()
    const data = parseBody(updateDocumentTypeSchema, body)

    const existing = await prisma.documentType.findUnique({
      where: { id: data.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Tipo de documento não encontrado' }, { status: 404 })
    }

    const updateData: Prisma.DocumentTypeUpdateInput = {}

    if (data.label !== undefined) updateData.label = data.label.trim()
    if (data.value !== undefined) updateData.value = data.value.trim().toUpperCase()
    if (typeof data.orderIndex === 'number') updateData.orderIndex = data.orderIndex
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive

    const documentType = await prisma.documentType.update({
      where: { id: data.id },
      data: updateData
    })

    return NextResponse.json(documentType)
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Já existe um tipo com esse código' },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar tipo de documento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireAdmin()
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const existing = await prisma.documentType.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Tipo de documento não encontrado' }, { status: 404 })
    }

    await prisma.documentType.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Tipo de documento excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir tipo de documento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
