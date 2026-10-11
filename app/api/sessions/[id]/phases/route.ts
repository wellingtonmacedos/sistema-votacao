import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const PHASE_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendada',
  PEQUENO_EXPEDIENTE: 'Pequeno Expediente',
  GRANDE_EXPEDIENTE: 'Grande Expediente',
  ORDEM_DO_DIA: 'Ordem do Dia',
  CONSIDERACOES_FINAIS: 'Considerações Finais',
  TRIBUNA_LIVE: 'Tribuna Livre',
  CLOSED: 'Encerrada'
}

const PHASE_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-500',
  PEQUENO_EXPEDIENTE: 'bg-yellow-500',
  GRANDE_EXPEDIENTE: 'bg-orange-500',
  ORDEM_DO_DIA: 'bg-purple-500',
  CONSIDERACOES_FINAIS: 'bg-indigo-500',
  TRIBUNA_LIVE: 'bg-pink-500',
  CLOSED: 'bg-gray-500'
}

function toHuman(phase: string) {
  return PHASE_LABELS[phase] || phase
}

function durationMs(a: Date, b: Date) {
  return Math.max(0, new Date(b).getTime() - new Date(a).getTime())
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return '-'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const id = params.id

    const phases = await prisma.sessionPhase.findMany({
      where: { sessionId: id },
      orderBy: { startedAt: 'asc' }
    })

    const votingSession = await prisma.votingSession.findUnique({
      where: { id },
      select: { id: true, title: true, sessionNumber: true, status: true, createdAt: true, startedAt: true, endedAt: true, date: true }
    })

    if (!votingSession) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    }

    const now = new Date()
    const rows = phases.map(p => {
      const startedAt = new Date(p.startedAt)
      const endedAt = p.endedAt ? new Date(p.endedAt) : (p.phase !== votingSession.status ? startedAt : null)
      const endRef = endedAt || now
      const duration = endedAt ? durationMs(startedAt, endedAt) : (p.phase === votingSession.status ? durationMs(startedAt, now) : 0)
      return {
        id: p.id,
        phase: p.phase,
        label: toHuman(p.phase as string),
        color: PHASE_COLORS[p.phase as string] || 'bg-slate-500',
        startedAt: startedAt.toISOString(),
        endedAt: endedAt ? endedAt.toISOString() : null,
        isOpen: !endedAt && p.phase === votingSession.status,
        durationMs: duration,
        durationHuman: formatDuration(duration)
      }
    })

    const totalDurationMs = rows.reduce((acc, r) => acc + (r.durationMs || 0), 0)

    return NextResponse.json({
      session: votingSession,
      phases: rows,
      summary: {
        totalPhases: rows.length,
        totalDurationMs,
        totalDurationHuman: formatDuration(totalDurationMs)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar fases da sessão:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
