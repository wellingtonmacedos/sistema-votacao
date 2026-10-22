import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { parseBody, createPhaseSchema, updatePhaseSchema, ValidationError } from '@/lib/validations'

const DEFAULT_PHASES = [
  { name: 'Pequeno Expediente', orderIndex: 0, color: '#eab308', hasVoting: false },
  { name: 'Grande Expediente', orderIndex: 1, color: '#f97316', hasVoting: false },
  { name: 'Ordem do Dia', orderIndex: 2, color: '#8b5cf6', hasVoting: true },
  { name: 'Considerações Finais', orderIndex: 3, color: '#6366f1', hasVoting: false },
  { name: 'Tribuna Livre', orderIndex: 4, color: '#ec4899', hasVoting: false },
  { name: 'Encerrada', orderIndex: 5, color: '#6b7280', hasVoting: false }
]

async function ensureDefaultPhases() {
  const count = await prisma.phase.count()

  if (count > 0) {
    return
  }

  await prisma.phase.createMany({
    data: DEFAULT_PHASES.map((phase) => ({
      ...phase,
      isActive: true,
      isDefault: true
    }))
  })
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await ensureDefaultPhases()

    const phases = await prisma.phase.findMany({
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }]
    })

    return NextResponse.json(phases)
  } catch (error) {
    console.error('Erro ao buscar fases:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const data = parseBody(createPhaseSchema, body)
    const { name, orderIndex, color, isActive, hasVoting } = data

    const nextOrder = typeof orderIndex === 'number'
      ? orderIndex
      : (await prisma.phase.count())

    const phase = await prisma.phase.create({
      data: {
        name: name.trim(),
        orderIndex: nextOrder,
        color: color || '#6366f1',
        isActive: typeof isActive === 'boolean' ? isActive : true,
        hasVoting: typeof hasVoting === 'boolean' ? hasVoting : false,
        isDefault: false
      }
    })

    return NextResponse.json(phase)
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erro ao criar fase:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const data = parseBody(updatePhaseSchema, body)
    const { id, name, orderIndex, color, isActive, hasVoting } = data

    const existing = await prisma.phase.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Fase não encontrada' }, { status: 404 })
    }

    const updateData: Prisma.PhaseUpdateInput = {}
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'Nome da fase não pode ser vazio' }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (typeof orderIndex === 'number') updateData.orderIndex = orderIndex
    if (color !== undefined) updateData.color = color
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (typeof hasVoting === 'boolean') updateData.hasVoting = hasVoting

    const phase = await prisma.phase.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(phase)
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erro ao atualizar fase:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const phase = await prisma.phase.findUnique({ where: { id } })
    if (!phase) {
      return NextResponse.json({ error: 'Fase não encontrada' }, { status: 404 })
    }

    if (phase.isDefault) {
      return NextResponse.json({ error: 'Fases padrão não podem ser excluídas' }, { status: 400 })
    }

    await prisma.phase.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Fase excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir fase:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
