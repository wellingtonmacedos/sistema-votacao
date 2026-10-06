import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Recebe { ids: string[] } na nova ordem das fases ativas
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body: unknown = await request.json()
    const ids = body && typeof body === 'object' && 'ids' in body ? (body as { ids: unknown }).ids : null
    if (!Array.isArray(ids) || !ids.every((id): id is string => typeof id === 'string')) {
      return NextResponse.json({ error: 'Lista de fases inválida' }, { status: 400 })
    }

    const active = await prisma.phaseDefinition.findMany({ where: { isActive: true }, select: { id: true } })
    const activeIds = new Set(active.map((phase) => phase.id))
    if (new Set(ids).size !== ids.length || ids.length !== activeIds.size || !ids.every((id) => activeIds.has(id))) {
      return NextResponse.json({ error: 'A lista deve conter todas as fases ativas, sem repetição' }, { status: 400 })
    }

    await prisma.$transaction(
      ids.map((id, index) => prisma.phaseDefinition.update({ where: { id }, data: { orderIndex: index + 1 } }))
    )

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: 'PHASE_REORDER', details: JSON.stringify({ ids }) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao reordenar fases:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
