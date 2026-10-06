"use client"

import { useState } from "react"
import { toast } from "react-hot-toast"
import { ArrowDown, ArrowUp, Edit, Layers, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { type PhaseDefinition, type PhaseSpeechType, PHASE_COLORS, phaseColor } from "@/lib/phases"

interface PhaseForm {
  name: string
  color: string
  hasDocuments: boolean
  hasVoting: boolean
  isVotingAgenda: boolean
  speechType: PhaseSpeechType | 'NONE'
}

const EMPTY_FORM: PhaseForm = {
  name: '',
  color: 'blue',
  hasDocuments: false,
  hasVoting: false,
  isVotingAgenda: false,
  speechType: 'NONE',
}

const SPEECH_LABELS: Record<PhaseSpeechType | 'NONE', string> = {
  NONE: 'Sem inscrições de fala',
  CONSIDERACOES_FINAIS: 'Inscrições de vereadores',
  TRIBUNA_LIVE: 'Inscrições de cidadãos (tribuna popular)',
}

interface PhasesManagerProps {
  phases: PhaseDefinition[]
  currentPhaseKey: string
  onChange: () => Promise<void> | void
}

export function PhasesManager({ phases, currentPhaseKey, onChange }: PhasesManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PhaseDefinition | null>(null)
  const [form, setForm] = useState<PhaseForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (phase: PhaseDefinition) => {
    setEditing(phase)
    setForm({
      name: phase.name,
      color: phase.color,
      hasDocuments: phase.hasDocuments,
      hasVoting: phase.hasVoting,
      isVotingAgenda: phase.isVotingAgenda,
      speechType: phase.speechType ?? 'NONE',
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome da fase')
      return
    }
    setSaving(true)
    try {
      const response = await fetch(editing ? `/api/phases/${editing.id}` : '/api/phases', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, speechType: form.speechType === 'NONE' ? null : form.speechType }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Erro ao salvar fase')
        return
      }
      toast.success(editing ? 'Fase atualizada' : 'Fase criada')
      setDialogOpen(false)
      await onChange()
    } catch (error) {
      toast.error('Erro de conexão ao salvar fase')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (phase: PhaseDefinition) => {
    if (!confirm(`Excluir a fase "${phase.name}"? Sessões e documentos antigos continuam mostrando o nome dela no histórico.`)) {
      return
    }
    try {
      const response = await fetch(`/api/phases/${phase.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Erro ao excluir fase')
        return
      }
      toast.success('Fase excluída')
      await onChange()
    } catch (error) {
      toast.error('Erro de conexão ao excluir fase')
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= phases.length) return
    const ids = phases.map((phase) => phase.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    try {
      const response = await fetch('/api/phases/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erro ao reordenar fases')
        return
      }
      await onChange()
    } catch (error) {
      toast.error('Erro de conexão ao reordenar fases')
    }
  }

  const describe = (phase: PhaseDefinition) => {
    const features: string[] = []
    if (phase.hasDocuments) features.push('Documentos')
    if (phase.isVotingAgenda) features.push('Pauta de votação')
    if (phase.hasVoting) features.push('Votação')
    if (phase.speechType) features.push(SPEECH_LABELS[phase.speechType])
    return features
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-slate-600" />
            Fases da Sessão
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Defina o nome, a ordem e o que acontece em cada fase. A sessão começa pela primeira fase da lista.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Fase
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {phases.length === 0 && (
            <p className="text-sm text-gray-500">Nenhuma fase cadastrada.</p>
          )}
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-sm font-semibold text-gray-400 w-6 pt-0.5">{index + 1}.</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block h-3 w-3 rounded-full ${phaseColor(phase.color).badge}`} />
                    <h4 className="font-medium">{phase.name}</h4>
                    {phase.key === currentPhaseKey && <Badge className="bg-green-600 text-[10px]">EM ANDAMENTO</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {describe(phase).length === 0 ? (
                      <Badge variant="outline">Somente exibição</Badge>
                    ) : (
                      describe(phase).map((feature) => (
                        <Badge key={feature} variant="secondary">{feature}</Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button variant="outline" size="sm" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Mover para cima">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => move(index, 1)} disabled={index === phases.length - 1} aria-label="Mover para baixo">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(phase)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(phase)} className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Fase' : 'Nova Fase'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1" htmlFor="phase-name">Nome da fase *</label>
              <Input
                id="phase-name"
                value={form.name}
                maxLength={60}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Explicações Pessoais"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Cor</label>
              <Select value={form.color} onValueChange={(color) => setForm({ ...form, color })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PHASE_COLORS).map(([value, color]) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block h-3 w-3 rounded-full ${color.badge}`} />
                        {color.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <PhaseOption
                id="phase-documents"
                label="Documentos"
                description="Permite cadastrar documentos nesta fase e exibi-los no painel."
                checked={form.hasDocuments}
                onChange={(hasDocuments) => setForm({ ...form, hasDocuments })}
              />
              <PhaseOption
                id="phase-voting"
                label="Votação"
                description="Permite abrir votação dos documentos durante esta fase."
                checked={form.hasVoting || form.isVotingAgenda}
                disabled={form.isVotingAgenda}
                onChange={(hasVoting) => setForm({ ...form, hasVoting })}
              />
              <PhaseOption
                id="phase-agenda"
                label="Pauta de votação (Ordem do Dia)"
                description="Lista os documentos enviados para votação a partir das outras fases. Só uma fase pode ter essa opção."
                checked={form.isVotingAgenda}
                onChange={(isVotingAgenda) => setForm({ ...form, isVotingAgenda, hasVoting: form.hasVoting || isVotingAgenda })}
              />
              <div>
                <label className="text-sm font-medium block mb-1">Inscrições para fala</label>
                <Select
                  value={form.speechType}
                  onValueChange={(speechType) => setForm({ ...form, speechType: speechType as PhaseForm['speechType'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SPEECH_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function PhaseOption({ id, label, description, checked, disabled, onChange }: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  )
}
