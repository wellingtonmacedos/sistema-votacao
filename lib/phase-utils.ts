export const PHASE_STATUS_KEYS = [
  'SCHEDULED',
  'PEQUENO_EXPEDIENTE',
  'GRANDE_EXPEDIENTE',
  'ORDEM_DO_DIA',
  'CONSIDERACOES_FINAIS',
  'TRIBUNA_LIVE',
  'CLOSED'
] as const

export type PhaseStatusKey = (typeof PHASE_STATUS_KEYS)[number]

// Nome exibido (sem acento, minúsculo) -> chave do enum
const PHASE_NAME_TO_KEY: Record<string, PhaseStatusKey> = {
  agendada: 'SCHEDULED',
  'pequeno expediente': 'PEQUENO_EXPEDIENTE',
  'grande expediente': 'GRANDE_EXPEDIENTE',
  'ordem do dia': 'ORDEM_DO_DIA',
  'consideracoes finais': 'CONSIDERACOES_FINAIS',
  'tribuna livre': 'TRIBUNA_LIVE',
  encerrada: 'CLOSED',
  encerramento: 'CLOSED'
}

export function normalizePhaseText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

// Aceita tanto a chave do enum (GRANDE_EXPEDIENTE) quanto o nome ("Grande Expediente")
export function toPhaseStatusKey(value?: string | null): PhaseStatusKey | null {
  if (!value) return null

  const trimmed = value.trim()
  const asKey = trimmed.toUpperCase().replace(/\s+/g, '_')

  if ((PHASE_STATUS_KEYS as readonly string[]).includes(asKey)) {
    return asKey as PhaseStatusKey
  }

  return PHASE_NAME_TO_KEY[normalizePhaseText(trimmed)] ?? null
}

export const PHASE_LABELS: Record<PhaseStatusKey, string> = {
  SCHEDULED: 'Agendada',
  PEQUENO_EXPEDIENTE: 'Pequeno Expediente',
  GRANDE_EXPEDIENTE: 'Grande Expediente',
  ORDEM_DO_DIA: 'Ordem do Dia',
  CONSIDERACOES_FINAIS: 'Considerações Finais',
  TRIBUNA_LIVE: 'Tribuna Livre',
  CLOSED: 'Encerrada'
}

export function getPhaseLabel(value?: string | null): string {
  if (!value) return 'Aguardando'
  const key = toPhaseStatusKey(value)
  return key ? PHASE_LABELS[key] : value
}
