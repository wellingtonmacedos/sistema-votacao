export type PhaseSpeechType = 'CONSIDERACOES_FINAIS' | 'TRIBUNA_LIVE'

export interface PhaseDefinition {
  id: string
  key: string
  name: string
  orderIndex: number
  color: string
  isActive: boolean
  hasDocuments: boolean
  hasVoting: boolean
  isVotingAgenda: boolean
  speechType: PhaseSpeechType | null
}

export const SESSION_SCHEDULED = 'SCHEDULED'
export const SESSION_CLOSED = 'CLOSED'

export const PHASE_COLORS: Record<string, { label: string; badge: string; card: string; activeCard: string; icon: string }> = {
  blue: { label: 'Azul', badge: 'bg-blue-500', card: 'hover:border-blue-400 hover:bg-blue-50', activeCard: 'bg-blue-100 border-blue-500 text-blue-700', icon: 'text-blue-600' },
  purple: { label: 'Roxo', badge: 'bg-purple-500', card: 'hover:border-purple-400 hover:bg-purple-50', activeCard: 'bg-purple-100 border-purple-500 text-purple-700', icon: 'text-purple-600' },
  red: { label: 'Vermelho', badge: 'bg-red-500', card: 'hover:border-red-400 hover:bg-red-50', activeCard: 'bg-red-100 border-red-500 text-red-700', icon: 'text-red-600' },
  green: { label: 'Verde', badge: 'bg-green-500', card: 'hover:border-green-400 hover:bg-green-50', activeCard: 'bg-green-100 border-green-500 text-green-700', icon: 'text-green-600' },
  yellow: { label: 'Amarelo', badge: 'bg-yellow-500', card: 'hover:border-yellow-400 hover:bg-yellow-50', activeCard: 'bg-yellow-100 border-yellow-500 text-yellow-700', icon: 'text-yellow-600' },
  orange: { label: 'Laranja', badge: 'bg-orange-500', card: 'hover:border-orange-400 hover:bg-orange-50', activeCard: 'bg-orange-100 border-orange-500 text-orange-700', icon: 'text-orange-600' },
  pink: { label: 'Rosa', badge: 'bg-pink-500', card: 'hover:border-pink-400 hover:bg-pink-50', activeCard: 'bg-pink-100 border-pink-500 text-pink-700', icon: 'text-pink-600' },
  indigo: { label: 'Índigo', badge: 'bg-indigo-500', card: 'hover:border-indigo-400 hover:bg-indigo-50', activeCard: 'bg-indigo-100 border-indigo-500 text-indigo-700', icon: 'text-indigo-600' },
  teal: { label: 'Verde-água', badge: 'bg-teal-500', card: 'hover:border-teal-400 hover:bg-teal-50', activeCard: 'bg-teal-100 border-teal-500 text-teal-700', icon: 'text-teal-600' },
  gray: { label: 'Cinza', badge: 'bg-gray-500', card: 'hover:border-gray-400 hover:bg-gray-50', activeCard: 'bg-gray-100 border-gray-500 text-gray-700', icon: 'text-gray-600' },
}

export const DEFAULT_PHASE_COLOR = 'blue'

export const phaseColor = (color: string | undefined) => PHASE_COLORS[color ?? ''] ?? PHASE_COLORS[DEFAULT_PHASE_COLOR]

export const findPhase = (phases: PhaseDefinition[], key: string | null | undefined) =>
  phases.find((phase) => phase.key === key)

export function phaseLabel(phases: PhaseDefinition[], key: string | null | undefined): string {
  if (!key) return ''
  if (key === SESSION_SCHEDULED) return 'Agendada'
  if (key === SESSION_CLOSED) return 'Encerrada'
  return findPhase(phases, key)?.name ?? key
}

export function phaseBadgeClass(phases: PhaseDefinition[], key: string | null | undefined): string {
  if (key === SESSION_SCHEDULED) return 'bg-gray-500'
  if (key === SESSION_CLOSED) return 'bg-gray-700'
  return phaseColor(findPhase(phases, key)?.color).badge
}

export const activePhases = (phases: PhaseDefinition[]) =>
  phases.filter((phase) => phase.isActive).sort((a, b) => a.orderIndex - b.orderIndex)

export const phaseAllowsVoting = (phases: PhaseDefinition[], key: string | null | undefined) =>
  findPhase(phases, key)?.hasVoting ?? false

export const phaseSpeechType = (phases: PhaseDefinition[], key: string | null | undefined) =>
  findPhase(phases, key)?.speechType ?? null
