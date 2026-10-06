import { PHASE_COLORS } from '@/lib/phases'

export interface PhaseInput {
  name: string
  color: string
  hasDocuments: boolean
  hasVoting: boolean
  isVotingAgenda: boolean
  speechType: 'CONSIDERACOES_FINAIS' | 'TRIBUNA_LIVE' | null
}

const SPEECH_TYPES = ['CONSIDERACOES_FINAIS', 'TRIBUNA_LIVE'] as const

export function parsePhaseInput(body: unknown): { data?: PhaseInput; error?: string } {
  if (!body || typeof body !== 'object') return { error: 'Dados inválidos' }
  const input = body as Record<string, unknown>
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) return { error: 'Informe o nome da fase' }
  if (name.length > 60) return { error: 'O nome da fase deve ter no máximo 60 caracteres' }

  const color = typeof input.color === 'string' && input.color in PHASE_COLORS ? input.color : 'blue'
  const speechType = SPEECH_TYPES.find((type) => type === input.speechType) ?? null

  return {
    data: {
      name,
      color,
      hasDocuments: input.hasDocuments === true,
      hasVoting: input.hasVoting === true || input.isVotingAgenda === true,
      isVotingAgenda: input.isVotingAgenda === true,
      speechType,
    },
  }
}

export function phaseKeyFromName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${slug || 'FASE'}_${suffix}`
}
