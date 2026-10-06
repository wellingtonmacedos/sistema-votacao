

"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { toast } from "react-hot-toast"
import { 
  Users, 
  Settings, 
  UserPlus, 
  Database,
  Activity,
  Shield,
  Calendar,
  FileText,
  Play,
  Vote,
  CheckCircle,
  Clock,
  Gavel,
  MessageSquare,
  Mic,
  ArrowRight,
  Plus,
  Monitor,
  StopCircle,
  Eye,
  Timer,
  BookOpen,
  User,
  Trash2,
  Edit,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  ScrollText,
  ListChecks,
  Megaphone,
  Building2,
  Upload,
  Loader2,
  BarChart,
  Menu,
  ExternalLink,
  Layers
} from "lucide-react"
import Link from "next/link"
import { usePhases } from "@/hooks/use-phases"
import { PhasesManager } from "@/components/phases-manager"
import {
  type PhaseDefinition,
  activePhases,
  phaseBadgeClass,
  phaseColor,
  phaseLabel,
  SESSION_CLOSED,
  SESSION_SCHEDULED,
} from "@/lib/phases"

// Definição dos itens do menu lateral
const menuItemsBeforePhases = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard, color: 'text-blue-600' },
  { id: 'vereadores', label: 'Vereadores', icon: Users, color: 'text-indigo-600' },
  { id: 'sessoes', label: 'Sessões', icon: Calendar, color: 'text-purple-600' },
  { id: 'painel', label: 'Painel Público', icon: Monitor, color: 'text-cyan-600' },
]

const menuItemsAfterPhases = [
  { id: 'fases', label: 'Configurar Fases', icon: Layers, color: 'text-slate-600' },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart, color: 'text-pink-600', href: '/admin/relatorios' },
]

const phaseTabId = (key: string) => `fase:${key}`

const phaseIcon = (phase: PhaseDefinition) => {
  if (phase.speechType === 'TRIBUNA_LIVE') return Megaphone
  if (phase.speechType === 'CONSIDERACOES_FINAIS') return MessageSquare
  if (phase.isVotingAgenda) return ListChecks
  if (phase.hasDocuments) return FileText
  if (phase.hasVoting) return Vote
  return ScrollText
}

// Documentos legados (sem fase própria) continuam listados nas fases padrão pelo tipo
const DOCUMENT_TYPE_OPTIONS_BY_PHASE: Record<string, { value: string; label: string }[]> = {
  GRANDE_EXPEDIENTE: [{ value: 'REQUERIMENTO', label: 'Requerimento' }, { value: 'PROJETO', label: 'Projeto' }],
  ORDEM_DO_DIA: [{ value: 'PROJETO', label: 'Projeto' }, { value: 'REQUERIMENTO', label: 'Requerimento' }],
}

const LEGACY_DOCUMENT_TYPES_BY_PHASE: Record<string, string[]> = {
  PEQUENO_EXPEDIENTE: ['ATA_ANTERIOR', 'DISPENSA_ATA', 'COMUNICADO'],
  GRANDE_EXPEDIENTE: ['REQUERIMENTO', 'PROJETO', 'INDICACAO', 'MOCAO'],
}

// Componente para gerenciar Considerações Finais
function ConsideracoesFinaisTab({ phaseName }: { phaseName: string }) {
  const [speechRequests, setSpeechRequests] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [speechSubject, setSpeechSubject] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<any>(null)
  const [selectedTimes, setSelectedTimes] = useState<{[key: string]: number}>({})
  const [customTimes, setCustomTimes] = useState<{[key: string]: string}>({})

  useEffect(() => {
    fetchData()
    fetchSessionStatus()
  }, [])

  const fetchSessionStatus = async () => {
    try {
      const response = await fetch('/api/session/status')
      if (response.ok) {
        const data = await response.json()
        setSessionStatus(data)
      }
    } catch (error) {
      console.error('Erro ao carregar status da sessão:', error)
    }
  }

  const fetchData = async () => {
    try {
      // Buscar solicitações de fala do tipo CONSIDERACOES_FINAIS
      const speechResponse = await fetch('/api/speech-request?type=CONSIDERACOES_FINAIS')
      if (speechResponse.ok) {
        const speechData = await speechResponse.json()
        setSpeechRequests(speechData)
      }

      // Buscar lista de vereadores
      const usersResponse = await fetch('/api/users?role=COUNCILOR')
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const handleApproveSpeech = async (speechId: string, isApproved: boolean) => {
    try {
      const response = await fetch(`/api/speech-request/${speechId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved })
      })
      
      if (response.ok) {
        toast.success(isApproved ? 'Solicitação aprovada!' : 'Solicitação rejeitada!')
        fetchData()
      }
    } catch (error) {
      toast.error('Erro ao processar solicitação')
    }
  }

  const handleStartSpeech = async (speechId: string) => {
    const timeLimit = selectedTimes[speechId] || 5 // Default 5 minutos
    
    try {
      const response = await fetch('/api/admin/speech-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          speechRequestId: speechId,
          timeLimit 
        })
      })
      
      if (response.ok) {
        toast.success('Pronunciamento iniciado!')
        fetchData()
        fetchSessionStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao iniciar pronunciamento')
      }
    } catch (error) {
      toast.error('Erro ao iniciar pronunciamento')
    }
  }

  const handleEndSpeech = async (speechId: string) => {
    try {
      const response = await fetch('/api/admin/speech-control', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          speechRequestId: speechId
        })
      })
      
      if (response.ok) {
        toast.success('Pronunciamento finalizado!')
        fetchData()
        fetchSessionStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao finalizar pronunciamento')
      }
    } catch (error) {
      toast.error('Erro ao finalizar pronunciamento')
    }
  }

  const handleTimeSelection = (speechId: string, minutes: number) => {
    setSelectedTimes(prev => ({ ...prev, [speechId]: minutes }))
    setCustomTimes(prev => ({ ...prev, [speechId]: '' })) // Limpar custom time ao selecionar preset
  }

  const handleCustomTimeChange = (speechId: string, value: string) => {
    setCustomTimes(prev => ({ ...prev, [speechId]: value }))
    const minutes = parseInt(value)
    if (!isNaN(minutes) && minutes > 0) {
      setSelectedTimes(prev => ({ ...prev, [speechId]: minutes }))
    }
  }

  const handleAddSpeechRequest = async () => {
    if (!selectedUser || !speechSubject) return
    
    try {
      const response = await fetch('/api/speech-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: selectedUser,
          subject: speechSubject,
          type: 'CONSIDERACOES_FINAIS'
        })
      })
      
      if (response.ok) {
        toast.success('Vereador cadastrado nas considerações finais!')
        setSelectedUser('')
        setSpeechSubject('')
        setIsDialogOpen(false)
        fetchData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao cadastrar vereador')
      }
    } catch (error) {
      toast.error('Erro ao cadastrar vereador')
    }
  }

  const handleDeleteSpeechRequest = async (speechId: string) => {
    if (!confirm('Tem certeza que deseja remover esta solicitação?')) return
    
    try {
      const response = await fetch(`/api/speech-request/${speechId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Solicitação removida!')
        fetchData()
      }
    } catch (error) {
      toast.error('Erro ao remover solicitação')
    }
  }

  const handleToggleSpeechRequests = async () => {
    if (!sessionStatus?.id) {
      toast.error('Nenhuma sessão ativa encontrada')
      return
    }

    const isOpen = !sessionStatus.isSpeechRequestsOpen
    
    try {
      const response = await fetch('/api/admin/toggle-speech-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: sessionStatus.id,
          isOpen
        })
      })
      
      if (response.ok) {
        toast.success(isOpen ? 'Inscrições abertas!' : 'Inscrições fechadas!')
        fetchSessionStatus()
      }
    } catch (error) {
      toast.error('Erro ao gerenciar inscrições')
    }
  }

  return (
    <div className="space-y-6">
      {/* Controles de inscrições */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Gerenciar Solicitações de Fala</h3>
          <Badge 
            variant={sessionStatus?.isSpeechRequestsOpen ? "default" : "secondary"}
            className={sessionStatus?.isSpeechRequestsOpen ? "bg-green-600" : ""}
          >
            {sessionStatus?.isSpeechRequestsOpen ? "Inscrições Abertas" : "Inscrições Fechadas"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant={sessionStatus?.isSpeechRequestsOpen ? "destructive" : "default"}
            onClick={handleToggleSpeechRequests}
          >
            {sessionStatus?.isSpeechRequestsOpen ? (
              <>
                <StopCircle className="h-4 w-4 mr-1" />
                Fechar Inscrições
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Abrir Inscrições
              </>
            )}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-1" />
                Cadastrar Vereador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Vereador - {phaseName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Selecionar Vereador</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um vereador" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Assunto da Fala</label>
                  <Input
                    value={speechSubject}
                    onChange={(e) => setSpeechSubject(e.target.value)}
                    placeholder="Ex: Questões sobre obras públicas"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleAddSpeechRequest}>Cadastrar</Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de solicitações */}
      <div className="space-y-4">
        {speechRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma solicitação de fala ainda</p>
        ) : (
          speechRequests.map((request) => (
            <div key={request.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">{request.subject}</h4>
                <p className="text-sm text-gray-600">
                  Solicitado por: {request.user?.fullName || request.citizenName || 'N/A'}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant={request.isApproved ? 'default' : 'secondary'}>
                    {request.isApproved ? 'Aprovada' : 'Pendente'}
                  </Badge>
                  {request.hasSpoken && <Badge variant="outline">Já falou</Badge>}
                  {request.isSpeaking && <Badge className="bg-green-600">Falando agora</Badge>}
                </div>
                {request.legislativeProcesses?.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    {request.legislativeProcesses.length} processo(s) legislativo(s)
                  </p>
                )}
              </div>
              
              <div className="flex flex-col gap-3">
                {!request.isApproved && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproveSpeech(request.id, true)}
                      className="bg-green-50 hover:bg-green-100"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSpeechRequest(request.id)}
                      className="bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                )}
                
                {request.isApproved && !request.hasSpoken && (
                  <>
                    {!request.isSpeaking && (
                      <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <label className="text-xs font-medium text-gray-700">
                          Tempo de Pronunciamento:
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant={selectedTimes[request.id] === 1 ? "default" : "outline"}
                            onClick={() => handleTimeSelection(request.id, 1)}
                            className="w-16"
                          >
                            1 min
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedTimes[request.id] === 5 ? "default" : "outline"}
                            onClick={() => handleTimeSelection(request.id, 5)}
                            className="w-16"
                          >
                            5 min
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedTimes[request.id] === 10 ? "default" : "outline"}
                            onClick={() => handleTimeSelection(request.id, 10)}
                            className="w-16"
                          >
                            10 min
                          </Button>
                          <Input
                            type="number"
                            placeholder="Custom"
                            value={customTimes[request.id] || ''}
                            onChange={(e) => handleCustomTimeChange(request.id, e.target.value)}
                            className="w-24 h-9"
                            min="1"
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Tempo selecionado: <span className="font-semibold">{selectedTimes[request.id] || 5} minutos</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStartSpeech(request.id)}
                          className="bg-green-600 hover:bg-green-700 mt-2"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Iniciar Pronunciamento
                        </Button>
                      </div>
                    )}
                    
                    {request.isSpeaking && (
                      <div className="flex flex-col gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-700">
                            🎤 Falando agora
                          </span>
                          <Badge className="bg-green-600">
                            {request.timeLimit} min
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleEndSpeech(request.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <StopCircle className="h-4 w-4 mr-1" />
                          Encerrar Pronunciamento
                        </Button>
                      </div>
                    )}
                  </>
                )}
                
                {request.hasSpoken && (
                  <Badge variant="outline" className="w-fit">✓ Concluído</Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
// Componente para gerenciar Tribuna Livre
function TribunaLivreTab({ phaseName }: { phaseName: string }) {
  const [speechRequests, setSpeechRequests] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [speechSubject, setSpeechSubject] = useState('')
  const [manifestationSubject, setManifestationSubject] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<any>(null)
  const [selectedTimes, setSelectedTimes] = useState<{[key: string]: number}>({})
  const [customTimes, setCustomTimes] = useState<{[key: string]: string}>({})

  useEffect(() => {
    fetchData()
    fetchSessionStatus()
  }, [])

  const fetchSessionStatus = async () => {
    try {
      const response = await fetch('/api/session/status')
      if (response.ok) {
        const data = await response.json()
        setSessionStatus(data)
      }
    } catch (error) {
      console.error('Erro ao carregar status da sessão:', error)
    }
  }

  const fetchData = async () => {
    try {
      // Buscar solicitações de fala do tipo TRIBUNA_LIVE
      const speechResponse = await fetch('/api/speech-request?type=TRIBUNA_LIVE')
      if (speechResponse.ok) {
        const speechData = await speechResponse.json()
        setSpeechRequests(speechData)
      }

      // Buscar lista de vereadores
      const usersResponse = await fetch('/api/users?role=COUNCILOR')
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const handleApproveSpeech = async (speechId: string, isApproved: boolean) => {
    try {
      const response = await fetch(`/api/speech-request/${speechId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved })
      })
      
      if (response.ok) {
        toast.success(isApproved ? 'Solicitação aprovada!' : 'Solicitação rejeitada!')
        fetchData()
      }
    } catch (error) {
      toast.error('Erro ao processar solicitação')
    }
  }

  const handleStartSpeech = async (speechId: string) => {
    const timeLimit = selectedTimes[speechId] || 5 // Default 5 minutos
    
    try {
      const response = await fetch('/api/admin/speech-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          speechRequestId: speechId,
          timeLimit 
        })
      })
      
      if (response.ok) {
        toast.success('Manifestação iniciada!')
        fetchData()
        fetchSessionStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao iniciar manifestação')
      }
    } catch (error) {
      toast.error('Erro ao iniciar manifestação')
    }
  }

  const handleEndSpeech = async (speechId: string) => {
    try {
      const response = await fetch('/api/admin/speech-control', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          speechRequestId: speechId
        })
      })
      
      if (response.ok) {
        toast.success('Manifestação finalizada!')
        fetchData()
        fetchSessionStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao finalizar manifestação')
      }
    } catch (error) {
      toast.error('Erro ao finalizar manifestação')
    }
  }

  const handleTimeSelection = (speechId: string, minutes: number) => {
    setSelectedTimes(prev => ({ ...prev, [speechId]: minutes }))
    setCustomTimes(prev => ({ ...prev, [speechId]: '' })) // Limpar custom time ao selecionar preset
  }

  const handleCustomTimeChange = (speechId: string, value: string) => {
    setCustomTimes(prev => ({ ...prev, [speechId]: value }))
    const minutes = parseInt(value)
    if (!isNaN(minutes) && minutes > 0) {
      setSelectedTimes(prev => ({ ...prev, [speechId]: minutes }))
    }
  }

  const handleAddSpeechRequest = async () => {
    if (!selectedUser || !manifestationSubject) return
    
    try {
      const response = await fetch('/api/speech-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          citizenName: selectedUser,
          citizenProfession: speechSubject || null,
          subject: manifestationSubject,
          type: 'TRIBUNA_LIVE'
        })
      })
      
      if (response.ok) {
        toast.success(`Cidadão cadastrado - ${phaseName}!`)
        setSelectedUser('')
        setSpeechSubject('')
        setManifestationSubject('')
        setIsDialogOpen(false)
        fetchData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao cadastrar cidadão')
      }
    } catch (error) {
      toast.error('Erro ao cadastrar cidadão')
    }
  }

  const handleDeleteSpeechRequest = async (speechId: string) => {
    if (!confirm('Tem certeza que deseja remover esta solicitação?')) return
    
    try {
      const response = await fetch(`/api/speech-request/${speechId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Solicitação removida!')
        fetchData()
      }
    } catch (error) {
      toast.error('Erro ao remover solicitação')
    }
  }

  const handleToggleSpeechRequests = async () => {
    if (!sessionStatus?.id) {
      toast.error('Nenhuma sessão ativa encontrada')
      return
    }

    const isOpen = !sessionStatus.isSpeechRequestsOpen
    
    try {
      const response = await fetch('/api/admin/toggle-speech-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: sessionStatus.id,
          isOpen
        })
      })
      
      if (response.ok) {
        toast.success(isOpen ? 'Inscrições abertas!' : 'Inscrições fechadas!')
        fetchSessionStatus()
      }
    } catch (error) {
      toast.error('Erro ao gerenciar inscrições')
    }
  }

  return (
    <div className="space-y-6">
      {/* Controles de inscrições */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Gerenciar {phaseName}</h3>
          <Badge 
            variant={sessionStatus?.isSpeechRequestsOpen ? "default" : "secondary"}
            className={sessionStatus?.isSpeechRequestsOpen ? "bg-yellow-600" : ""}
          >
            {sessionStatus?.isSpeechRequestsOpen ? "Inscrições Abertas" : "Inscrições Fechadas"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant={sessionStatus?.isSpeechRequestsOpen ? "destructive" : "default"}
            onClick={handleToggleSpeechRequests}
            className={!sessionStatus?.isSpeechRequestsOpen ? "bg-yellow-600 hover:bg-yellow-700" : ""}
          >
            {sessionStatus?.isSpeechRequestsOpen ? (
              <>
                <StopCircle className="h-4 w-4 mr-1" />
                Fechar Inscrições
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Abrir Inscrições
              </>
            )}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-1" />
                Cadastrar Cidadão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Cidadão - {phaseName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nome Completo do Cidadão *</label>
                  <Input
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    placeholder="Ex: João da Silva Santos"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Profissão (opcional)</label>
                  <Input
                    value={speechSubject}
                    onChange={(e) => setSpeechSubject(e.target.value)}
                    placeholder="Ex: Professora, Comerciante, Engenheiro..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Informação exibida no painel público</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Assunto da Manifestação *</label>
                  <Textarea
                    value={manifestationSubject}
                    onChange={(e) => setManifestationSubject(e.target.value)}
                    placeholder="Ex: Solicitação de melhorias no bairro Vila Nova"
                    rows={3}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleAddSpeechRequest} className="bg-yellow-600 hover:bg-yellow-700" disabled={!selectedUser || !manifestationSubject}>
                    Cadastrar
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de solicitações */}
      <div className="space-y-4">
        {speechRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma manifestação agendada ainda</p>
        ) : (
          speechRequests.map((request) => (
            <div key={request.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg border-yellow-200 bg-yellow-50/30">
              <div>
                <h4 className="font-medium">{request.subject}</h4>
                <p className="text-sm text-gray-600">
                  Solicitado por: {request.user?.fullName || request.citizenName || 'N/A'}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant={request.isApproved ? 'default' : 'secondary'} className={request.isApproved ? 'bg-yellow-600' : ''}>
                    {request.isApproved ? 'Aprovada' : 'Pendente'}
                  </Badge>
                  {request.hasSpoken && <Badge variant="outline">Já falou</Badge>}
                  {request.isSpeaking && <Badge className="bg-yellow-600">Falando agora</Badge>}
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                {!request.isApproved && (
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproveSpeech(request.id, true)}
                      className="bg-green-50 hover:bg-green-100"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSpeechRequest(request.id)}
                      className="bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                )}
                
                {request.isApproved && !request.hasSpoken && (
                  <>
                    {!request.isSpeaking && (
                      <div className="flex flex-col gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <label className="text-xs font-medium text-gray-700">
                          Tempo de Manifestação:
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant={selectedTimes[request.id] === 1 ? "default" : "outline"}
                            onClick={() => handleTimeSelection(request.id, 1)}
                            className={selectedTimes[request.id] === 1 ? "bg-yellow-600 hover:bg-yellow-700 w-16" : "w-16"}
                          >
                            1 min
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedTimes[request.id] === 5 ? "default" : "outline"}
                            onClick={() => handleTimeSelection(request.id, 5)}
                            className={selectedTimes[request.id] === 5 ? "bg-yellow-600 hover:bg-yellow-700 w-16" : "w-16"}
                          >
                            5 min
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedTimes[request.id] === 10 ? "default" : "outline"}
                            onClick={() => handleTimeSelection(request.id, 10)}
                            className={selectedTimes[request.id] === 10 ? "bg-yellow-600 hover:bg-yellow-700 w-16" : "w-16"}
                          >
                            10 min
                          </Button>
                          <Input
                            type="number"
                            placeholder="Custom"
                            value={customTimes[request.id] || ''}
                            onChange={(e) => handleCustomTimeChange(request.id, e.target.value)}
                            className="w-24 h-9"
                            min="1"
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Tempo selecionado: <span className="font-semibold">{selectedTimes[request.id] || 5} minutos</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStartSpeech(request.id)}
                          className="bg-yellow-600 hover:bg-yellow-700 mt-2"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Iniciar Manifestação
                        </Button>
                      </div>
                    )}
                    
                    {request.isSpeaking && (
                      <div className="flex flex-col gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-300">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-yellow-700">
                            🎤 Falando agora
                          </span>
                          <Badge className="bg-yellow-600">
                            {request.timeLimit} min
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleEndSpeech(request.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <StopCircle className="h-4 w-4 mr-1" />
                          Encerrar Manifestação
                        </Button>
                      </div>
                    )}
                  </>
                )}
                
                {request.hasSpoken && (
                  <Badge variant="outline" className="w-fit">✓ Concluído</Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Componente para gerenciar Vereadores
function VereadoresTab() {
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'COUNCILOR' as string,
    party: '',
    photoUrl: '',
    partyLogoUrl: ''
  })

  // Função para fazer upload de imagem
  const handleImageUpload = async (file: File, type: 'photo' | 'logo') => {
    if (type === 'photo') setUploadingPhoto(true)
    else setUploadingLogo(true)

    try {
      // 1. Obter URL de upload presigned
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type
        })
      })

      if (!presignedRes.ok) {
        const error = await presignedRes.json()
        throw new Error(error.error || 'Erro ao gerar URL de upload')
      }

      const { uploadUrl, publicUrl } = await presignedRes.json()

      // 2. Fazer upload
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })

      if (!uploadRes.ok) {
        throw new Error('Erro ao fazer upload da imagem')
      }

      // 3. Atualizar o formulário com a URL pública
      if (type === 'photo') {
        setFormData(prev => ({ ...prev, photoUrl: publicUrl }))
      } else {
        setFormData(prev => ({ ...prev, partyLogoUrl: publicUrl }))
      }

      toast.success('Imagem enviada com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar imagem')
    } finally {
      if (type === 'photo') setUploadingPhoto(false)
      else setUploadingLogo(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.email || (!editingUser && !formData.password)) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      const url = '/api/users'
      const method = editingUser ? 'PATCH' : 'POST'
      const body = editingUser 
        ? { id: editingUser.id, ...formData, password: formData.password || undefined }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        toast.success(editingUser ? 'Usuário atualizado!' : 'Usuário cadastrado!')
        setIsDialogOpen(false)
        setEditingUser(null)
        setFormData({ fullName: '', email: '', password: '', role: 'COUNCILOR', party: '', photoUrl: '', partyLogoUrl: '' })
        fetchUsers()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao salvar usuário')
      }
    } catch (error) {
      toast.error('Erro ao salvar usuário')
    }
  }

  const handleEdit = (user: any) => {
    setEditingUser(user)
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      party: user.party || '',
      photoUrl: user.photoUrl || '',
      partyLogoUrl: user.partyLogoUrl || ''
    })
    setIsDialogOpen(true)
  }

  const handleToggleActive = async (user: any) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive })
      })

      if (response.ok) {
        toast.success(user.isActive ? 'Usuário desativado!' : 'Usuário ativado!')
        fetchUsers()
      }
    } catch (error) {
      toast.error('Erro ao alterar status')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Badge className="bg-red-500">Administrador</Badge>
      case 'PRESIDENT': return <Badge className="bg-purple-500">Presidente</Badge>
      case 'COUNCILOR': return <Badge className="bg-blue-500">Vereador</Badge>
      default: return <Badge>{role}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Cadastro e Gestão de Vereadores
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingUser(null)
              setFormData({ fullName: '', email: '', password: '', role: 'COUNCILOR', party: '', photoUrl: '', partyLogoUrl: '' })
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nome Completo *</label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    placeholder="Ex: João da Silva Santos"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Ex: joao.silva@camara.gov.br"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Senha {editingUser ? '(deixe em branco para manter)' : '*'}
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Função *</label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COUNCILOR">Vereador</SelectItem>
                      <SelectItem value="PRESIDENT">Presidente</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campos específicos para vereadores */}
                {formData.role === 'COUNCILOR' && (
                  <>
                    <div className="border-t pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Informações do Vereador</h4>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Partido</label>
                      <Input
                        value={formData.party}
                        onChange={(e) => setFormData({...formData, party: e.target.value.toUpperCase()})}
                        placeholder="Ex: PSD, MDB, PT"
                        maxLength={20}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Foto do Vereador</label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={formData.photoUrl}
                          onChange={(e) => setFormData({...formData, photoUrl: e.target.value})}
                          placeholder="URL da foto ou faça upload"
                          className="flex-1"
                        />
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUpload(file, 'photo')
                            }}
                          />
                          <Button type="button" variant="outline" size="icon" disabled={uploadingPhoto} asChild>
                            <span>
                              {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </span>
                          </Button>
                        </label>
                      </div>
                      {formData.photoUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img 
                            src={formData.photoUrl} 
                            alt="Preview" 
                            className="w-12 h-12 rounded-full object-cover border"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                          <span className="text-xs text-green-600">✓ Preview da foto</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Logo do Partido</label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={formData.partyLogoUrl}
                          onChange={(e) => setFormData({...formData, partyLogoUrl: e.target.value})}
                          placeholder="URL do logo ou faça upload"
                          className="flex-1"
                        />
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUpload(file, 'logo')
                            }}
                          />
                          <Button type="button" variant="outline" size="icon" disabled={uploadingLogo} asChild>
                            <span>
                              {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </span>
                          </Button>
                        </label>
                      </div>
                      {formData.partyLogoUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img 
                            src={formData.partyLogoUrl} 
                            alt="Logo Partido" 
                            className="w-8 h-8 object-contain border rounded"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                          <span className="text-xs text-green-600">✓ Preview do logo</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                    {editingUser ? 'Salvar Alterações' : 'Cadastrar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : (
          <div className="space-y-3">
            {users.filter(user => user.isActive).map((user) => (
              <div key={user.id} className="p-4 rounded-lg border bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Foto do usuário */}
                    <div className="relative flex-shrink-0">
                      {user.photoUrl ? (
                        <img 
                          src={user.photoUrl} 
                          alt={user.fullName}
                          className="w-14 h-14 rounded-full object-cover border-2 border-blue-300 shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className={`w-14 h-14 rounded-full bg-blue-100 items-center justify-center ${user.photoUrl ? 'hidden' : 'flex'}`}>
                        <User className="h-7 w-7 text-blue-600" />
                      </div>
                      {/* Logo do partido sobreposto */}
                      {user.partyLogoUrl && (
                        <img 
                          src={user.partyLogoUrl} 
                          alt={user.party || ''} 
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full object-contain bg-white border border-gray-200 shadow-sm"
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{user.fullName}</h4>
                        {getRoleBadge(user.role)}
                        {user.party && (
                          <Badge variant="outline" className="text-gray-700 border-gray-400 bg-gray-50 font-medium">
                            {user.party}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleToggleActive(user)}
                    >
                      Desativar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {users.filter(user => user.isActive).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum vereador ativo cadastrado
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Componente para gerenciar Sessões
function SessoesTab() {
  const { phases } = usePhases()
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    quorum: 7
  })

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.scheduledAt) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      const url = '/api/admin/sessions'
      const method = editingSession ? 'PATCH' : 'POST'
      const body = editingSession 
        ? { id: editingSession.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        toast.success(editingSession ? 'Sessão atualizada!' : 'Sessão criada!')
        setIsDialogOpen(false)
        setEditingSession(null)
        setFormData({ title: '', description: '', scheduledAt: '', quorum: 7 })
        fetchSessions()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao salvar sessão')
      }
    } catch (error) {
      toast.error('Erro ao salvar sessão')
    }
  }

  const handleEdit = (session: any) => {
    setEditingSession(session)
    setFormData({
      title: session.title,
      description: session.description || '',
      scheduledAt: new Date(session.scheduledAt).toISOString().slice(0, 16),
      quorum: session.quorum
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta sessão?')) return

    try {
      const response = await fetch(`/api/admin/sessions?id=${sessionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Sessão excluída!')
        fetchSessions()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao excluir sessão')
      }
    } catch (error) {
      toast.error('Erro ao excluir sessão')
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === SESSION_SCHEDULED) return <Badge className="bg-blue-500">Agendada</Badge>
    if (status === SESSION_CLOSED) return <Badge className="bg-gray-500">Encerrada</Badge>
    return <Badge className={phaseBadgeClass(phases, status)}>{phaseLabel(phases, status)}</Badge>
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Cadastro e Gestão de Sessões
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingSession(null)
              setFormData({ title: '', description: '', scheduledAt: '', quorum: 7 })
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Sessão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSession ? 'Editar Sessão' : 'Criar Nova Sessão'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Título da Sessão *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Sessão Ordinária"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrição opcional da sessão..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Data e Hora *</label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Quórum Mínimo</label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.quorum}
                    onChange={(e) => setFormData({...formData, quorum: parseInt(e.target.value) || 7})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Número mínimo de vereadores para quórum</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                    {editingSession ? 'Salvar Alterações' : 'Criar Sessão'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma sessão cadastrada. Clique em &quot;Nova Sessão&quot; para criar.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 rounded-lg border bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Gavel className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{session.title}</h4>
                        {session.sessionNumber && (
                          <Badge variant="outline">Nº {session.sessionNumber}</Badge>
                        )}
                        {getStatusBadge(session.status)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(session.scheduledAt)} • Quórum: {session.quorum}
                      </p>
                      {session.description && (
                        <p className="text-sm text-gray-400 mt-1">{session.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(session)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    {session.status === 'SCHEDULED' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(session.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminDashboard() {
  const { phases, refresh: refreshPhases } = usePhases()
  const sessionPhases = activePhases(phases)
  const votingAgendaPhase = sessionPhases.find((phase) => phase.isVotingAgenda)
  const agendaName = votingAgendaPhase?.name ?? 'Ordem do Dia'
  const councilorSpeechPhaseName = sessionPhases.find((phase) => phase.speechType === 'CONSIDERACOES_FINAIS')?.name ?? 'Considerações Finais'
  const menuItems = [
    ...menuItemsBeforePhases,
    ...sessionPhases.map((phase) => ({
      id: phaseTabId(phase.key),
      label: phase.name,
      icon: phaseIcon(phase),
      color: phaseColor(phase.color).icon,
    })),
    ...menuItemsAfterPhases,
  ]
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [sessionPhase, setSessionPhase] = useState('SCHEDULED')
  const [documents, setDocuments] = useState<any[]>([])
  const [readingDocument, setReadingDocument] = useState<string | null>(null)
  const [timerActive, setTimerActive] = useState(false)
  const [timerDuration, setTimerDuration] = useState(300) // 5 minutos
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [attendanceData, setAttendanceData] = useState<{
    presentCount: number
    totalCount: number
    hasQuorum: boolean
    quorum: number
    attendances: any[]
  }>({ presentCount: 0, totalCount: 0, hasQuorum: false, quorum: 7, attendances: [] })
  const [uploadingDocumentPdf, setUploadingDocumentPdf] = useState(false)
  const [activeVoting, setActiveVoting] = useState<any>(null)
  const [isAttendanceJustificationOpen, setIsAttendanceJustificationOpen] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null)
  const [absenceJustification, setAbsenceJustification] = useState('')
  
  // Estados para o modal de adicionar documento
  const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false)
  const [documentPhase, setDocumentPhase] = useState('')
  const [availableSessions, setAvailableSessions] = useState<any[]>([]) // Lista de sessões disponíveis
  const [documentForm, setDocumentForm] = useState({
    title: '',
    type: '',
    content: '',
    sessionId: '',
    attachmentName: '',
    attachmentPath: '',
    attachmentUrl: '',
    attachmentMimeType: '',
    selectedAuthors: [] as string[] // IDs dos vereadores selecionados
  })
  const [councilorsForDocument, setCouncilorsForDocument] = useState<any[]>([]) // Lista de vereadores para o checkbox
  
  // Estados para criação de sessão
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false)
  const [isSelectSessionOpen, setIsSelectSessionOpen] = useState(false)
  const [scheduledSessions, setScheduledSessions] = useState<any[]>([])
  const [sessionForm, setSessionForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Buscar dados reais da sessão
  useEffect(() => {
    fetchSessionData()
    
    // Polling mais eficiente para o admin
    const interval = setInterval(fetchSessionData, 2000) // 2 segundos
    return () => clearInterval(interval)
  }, [])

  const fetchSessionData = async () => {
    try {
      let activeSessionId = null
      const response = await fetch('/api/public/current-session')
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setCurrentSession(data)
          setSessionPhase(data.status)
          setTimerActive(!!data.timer?.isActive)
          activeSessionId = data.id
        }
      }

      // Buscar documentos da sessão
      // Se tivermos uma sessão ativa, buscamos os documentos dela especificamente
      const docsUrl = activeSessionId 
        ? `/api/session/documents?sessionId=${activeSessionId}`
        : '/api/session/documents'
        
      const docsResponse = await fetch(docsUrl)
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData)
      }

      // Buscar status da chamada de presença
      const attendanceResponse = await fetch('/api/public/attendance')
      if (attendanceResponse.ok) {
        const attData = await attendanceResponse.json()
        if (attData) {
          setAttendanceOpen(attData.isAttendanceOpen)
          setAttendanceData({
            presentCount: attData.presentCount || 0,
            totalCount: attData.totalCount || 0,
            hasQuorum: attData.hasQuorum || false,
            quorum: attData.quorum || 7,
            attendances: attData.attendances || []
          })
        }
      }

      // Buscar votação ativa
      const votingResponse = await fetch('/api/admin/voting')
      if (votingResponse.ok) {
        const votingData = await votingResponse.json()
        setActiveVoting(votingData.activeVoting)
      }

      // Buscar sessões agendadas
      const sessionsResponse = await fetch('/api/admin/sessions')
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json()
        const scheduled = sessionsData.filter((s: any) => s.status === 'SCHEDULED')
        setScheduledSessions(scheduled)
      }
    } catch (error) {
      console.error('Erro ao buscar dados da sessão:', error)
    }
  }

  // Buscar lista de vereadores para o formulário de documento
  const fetchCouncilorsForDocument = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        // Filtrar apenas vereadores e presidente
        const councilors = data.filter((u: any) => u.role === 'COUNCILOR' || u.role === 'PRESIDENT')
        setCouncilorsForDocument(councilors)
      }
    } catch (error) {
      console.error('Erro ao buscar vereadores:', error)
    }
  }

  // Buscar lista de sessões disponíveis
  const fetchAvailableSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions')
      if (response.ok) {
        const data = await response.json()
        // Filtrar sessões encerradas (CLOSED) para não aparecerem na seleção
        const activeSessions = data.filter((session: any) => session.status !== 'CLOSED')
        setAvailableSessions(activeSessions)
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error)
    }
  }

  // Buscar dados quando o modal de documento abrir
  useEffect(() => {
    if (isAddDocumentOpen) {
      fetchCouncilorsForDocument()
      fetchAvailableSessions()
    }
  }, [isAddDocumentOpen])

  const handleDocumentPdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Envie um arquivo PDF válido')
      return
    }

    setUploadingDocumentPdf(true)

    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          category: 'document'
        })
      })

      if (!presignedRes.ok) {
        const error = await presignedRes.json()
        throw new Error(error.error || 'Erro ao gerar URL de upload do PDF')
      }

      const { uploadUrl, publicUrl, cloud_storage_path } = await presignedRes.json()

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })

      if (!uploadRes.ok) {
        throw new Error('Erro ao fazer upload do PDF')
      }

      setDocumentForm(prev => ({
        ...prev,
        attachmentName: file.name,
        attachmentPath: cloud_storage_path,
        attachmentUrl: publicUrl,
        attachmentMimeType: file.type
      }))

      toast.success('PDF enviado com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar PDF')
    } finally {
      setUploadingDocumentPdf(false)
    }
  }

  const openAttendanceJustification = (attendance: any) => {
    setSelectedAttendance(attendance)
    setAbsenceJustification(attendance.absenceJustification || '')
    setIsAttendanceJustificationOpen(true)
  }

  const handleSaveAttendanceJustification = async () => {
    if (!currentSession?.id || !selectedAttendance?.user?.id) return

    if (!absenceJustification.trim()) {
      toast.error('Informe a justificativa da falta')
      return
    }

    try {
      toast.loading('Salvando justificativa...', { id: 'attendance-justification' })

      const response = await fetch('/api/admin/attendance-justification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id,
          userId: selectedAttendance.user.id,
          justification: absenceJustification
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar justificativa')
      }

      toast.success('Falta justificada com sucesso!', { id: 'attendance-justification' })
      setIsAttendanceJustificationOpen(false)
      setSelectedAttendance(null)
      setAbsenceJustification('')
      await fetchSessionData()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar justificativa', { id: 'attendance-justification' })
    }
  }

  const handleRemoveAttendanceJustification = async (attendance: any) => {
    if (!currentSession?.id || !attendance?.user?.id) return

    try {
      toast.loading('Removendo justificativa...', { id: 'attendance-justification-remove' })

      const response = await fetch(`/api/admin/attendance-justification?sessionId=${currentSession.id}&userId=${attendance.user.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao remover justificativa')
      }

      toast.success('Justificativa removida com sucesso!', { id: 'attendance-justification-remove' })
      await fetchSessionData()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover justificativa', { id: 'attendance-justification-remove' })
    }
  }

  const startPhase = async (phase: string, navigateToTab: boolean = false) => {
    const phaseName = phaseLabel(phases, phase)

    toast.loading(`Iniciando ${phaseName}...`, { id: 'phase-change' })
    
    try {
      const response = await fetch('/api/session/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: phase })
      })
      
      if (response.ok) {
        setSessionPhase(phase)
        await fetchSessionData()
        toast.success(`✅ Fase "${phaseName}" iniciada com sucesso!`, { 
          id: 'phase-change',
          duration: 3000
        })
        
        // Navegar para a tab correspondente se solicitado
        if (navigateToTab && sessionPhases.some((p) => p.key === phase)) {
          setActiveTab(phaseTabId(phase))
        }
      } else {
        const error = await response.json()
        toast.error(`❌ ${error.error || 'Erro ao mudar fase'}`, { id: 'phase-change' })
      }
    } catch (error) {
      console.error('Erro ao iniciar fase:', error)
      toast.error('❌ Erro de conexão ao mudar fase', { id: 'phase-change' })
    }
  }

  // Função para navegar diretamente para a gestão de uma fase
  const goToPhaseManagement = (phase: string) => {
    if (sessionPhases.some((p) => p.key === phase)) {
      setActiveTab(phaseTabId(phase))
    }
  }

  // Controlar qual documento está sendo lido no painel
  const setDocumentReading = async (documentId: string, isReading: boolean) => {
    try {
      toast.loading(isReading ? 'Exibindo documento no painel...' : 'Parando exibição...', { id: 'doc-reading' })
      
      const response = await fetch('/api/admin/set-reading-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, isReading })
      })
      
      if (response.ok) {
        setReadingDocument(isReading ? documentId : null)
        await fetchSessionData()
        toast.success(isReading ? '✓ Documento exibido no painel!' : '✓ Exibição encerrada!', { id: 'doc-reading' })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao controlar exibição', { id: 'doc-reading' })
      }
    } catch (error) {
      console.error('Erro ao definir documento em leitura:', error)
      toast.error('Erro ao controlar exibição do documento', { id: 'doc-reading' })
    }
  }

  // Mover documento para Ordem do Dia
  const handleMoveToOrdemDoDia = async (documentId: string, documentTitle: string) => {
    try {
      toast.loading(`Movendo "${documentTitle}" para ${agendaName}...`, { id: 'move-ordem' })
      
      const response = await fetch('/api/admin/move-to-ordem-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`✓ Documento movido para ${agendaName}!`, { id: 'move-ordem', duration: 4000 })
        await fetchSessionData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao mover documento', { id: 'move-ordem' })
      }
    } catch (error) {
      console.error('Erro ao mover documento:', error)
      toast.error('Erro ao processar solicitação', { id: 'move-ordem' })
    }
  }

  // Remover documento da Ordem do Dia
  const handleRemoveFromOrdemDoDia = async (documentId: string, documentTitle: string) => {
    if (!confirm(`Deseja remover "${documentTitle}" de ${agendaName}?`)) {
      return
    }

    try {
      toast.loading('Removendo documento...', { id: 'remove-ordem' })
      
      const response = await fetch('/api/admin/move-to-ordem-dia', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      })

      if (response.ok) {
        toast.success(`Documento removido de ${agendaName}!`, { id: 'remove-ordem' })
        await fetchSessionData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao remover documento', { id: 'remove-ordem' })
      }
    } catch (error) {
      console.error('Erro ao remover documento:', error)
      toast.error('Erro ao processar solicitação', { id: 'remove-ordem' })
    }
  }

  // Controlar timer
  const handleTimerControl = async (action: 'start' | 'stop', phase?: string) => {
    try {
      const response = await fetch('/api/admin/timer-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: currentSession?.id,
          action,
          duration: timerDuration,
          phase: phase || 'CONSIDERAÇÕES FINAIS'
        })
      })
      if (response.ok) {
        setTimerActive(action === 'start')
        await fetchSessionData()
      }
    } catch (error) {
      console.error('Erro ao controlar timer:', error)
    }
  }

  // Criar nova sessão
  const handleCreateSession = async () => {
    try {
      toast.loading('🔄 Criando nova sessão...', { id: 'create-session' })
      
      const response = await fetch('/api/admin/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionForm)
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success('✅ Sessão criada com sucesso!', { id: 'create-session' })
        setIsCreateSessionOpen(false)
        setSessionForm({
          title: '',
          date: new Date().toISOString().split('T')[0]
        })
        await fetchSessionData()
      } else {
        const error = await response.json()
        toast.error(`❌ ${error.error || 'Erro ao criar sessão'}`, { id: 'create-session' })
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error)
      toast.error('❌ Erro de conexão ao criar sessão', { id: 'create-session' })
    }
  }

  // Controlar sessão (iniciar/encerrar)
  const handleSessionControl = async (action: 'start' | 'end', sessionId?: string) => {
    const targetId = sessionId || currentSession?.id
    if (!targetId) return

    try {
      const response = await fetch('/api/admin/session-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: targetId,
          action
        })
      })
      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        setIsSelectSessionOpen(false) // Fechar modal se estiver aberto
        await fetchSessionData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao controlar sessão')
      }
    } catch (error) {
      console.error('Erro ao controlar sessão:', error)
      toast.error('Erro ao controlar sessão')
    }
  }

  const handleStartSessionClick = () => {
    if (scheduledSessions.length === 0) {
      toast.error('Não há sessões agendadas para iniciar')
      return
    }

    if (scheduledSessions.length === 1) {
      handleSessionControl('start', scheduledSessions[0].id)
    } else {
      setIsSelectSessionOpen(true)
    }
  }

  // Controlar chamada de presença
  const handleAttendanceControl = async (action: 'start' | 'end') => {
    if (!currentSession?.id) return

    try {
      const actionText = action === 'start' ? 'Iniciando' : 'Encerrando'
      toast.loading(`⚡ ${actionText} chamada de presença...`, { id: 'attendance-control' })
      
      const response = await fetch('/api/admin/attendance-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: currentSession.id,
          action
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        setAttendanceOpen(action === 'start')
        await fetchSessionData()
        
        if (action === 'start') {
          toast.success('📋 Chamada aberta! Ela pode permanecer disponível durante toda a sessão para chegada tardia.', {
            id: 'attendance-control',
            duration: 4000
          })
          
          if (confirm('Deseja abrir o painel público para acompanhar as presenças?')) {
            window.open('/painel', '_blank')
          }
        } else {
          toast.success('✅ Chamada de presença encerrada com sucesso!', { id: 'attendance-control' })
        }
      } else {
        const error = await response.json()
        toast.error(`❌ ${error.error || 'Erro ao controlar chamada'}`, { id: 'attendance-control' })
      }
    } catch (error) {
      console.error('Erro ao controlar chamada:', error)
      toast.error('❌ Erro de conexão ao controlar chamada', { id: 'attendance-control' })
    }
  }

  const getPhaseTitle = (phase: string) => phaseLabel(phases, phase)

  const handleStartVoting = async (matterId: string) => {
    // Confirmar antes de iniciar a votação
    if (!confirm('Deseja iniciar a votação desta matéria? A votação será exibida no painel público.')) {
      return
    }

    try {
      console.log('🚀 Iniciando votação para matéria:', matterId)
      toast.loading('⚡ Iniciando votação e sincronizando painel...', { id: 'voting-start' })
      
      const requestBody = {
        action: 'start',
        type: 'matter',
        itemId: matterId
      }
      console.log('📤 Dados da requisição:', requestBody)
      
      const response = await fetch('/api/admin/voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('📥 Status da resposta:', response.status)
      console.log('📥 Headers da resposta:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Resultado da API:', result)
        
        // Atualizar dados do admin imediatamente
        await fetchSessionData()
        
        // Feedback aprimorado
        toast.success('🗳️ Votação iniciada! O painel público foi atualizado automaticamente.', { 
          id: 'voting-start',
          duration: 4000 
        })
        
        // Abrir painel público automaticamente se solicitado
        if (confirm('Deseja abrir o painel público para acompanhar a votação?')) {
          window.open('/painel', '_blank')
        }
        
      } else {
        const errorText = await response.text()
        console.error('❌ Erro da API (texto bruto):', errorText)
        
        let error
        try {
          error = JSON.parse(errorText)
          console.error('❌ Erro da API (JSON):', error)
        } catch {
          error = { error: errorText || `Erro HTTP ${response.status}` }
        }
        
        toast.error(`❌ ${error.error || 'Erro ao iniciar votação'} (Status: ${response.status})`, { 
          id: 'voting-start',
          duration: 6000 
        })
      }
    } catch (error) {
      console.error('❌ Erro completo:', error)
      toast.error(`❌ Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, { 
        id: 'voting-start',
        duration: 6000 
      })
    }
  }

  const handleEndVoting = async (type: 'matter' | 'document', itemId: string, itemTitle: string) => {
    // Confirmar antes de encerrar a votação
    if (!confirm(`Deseja ENCERRAR a votação "${itemTitle}"? Esta ação não pode ser desfeita e o resultado será calculado automaticamente.`)) {
      return
    }

    try {
      toast.loading('Encerrando votação...', { id: 'voting-end' })
      
      const response = await fetch('/api/admin/voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'end',
          type,
          itemId 
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success('✅ Votação encerrada com sucesso! Resultado calculado.', { id: 'voting-end' })
        
        // Mostrar resultado temporariamente no painel público
        await showVotingResult(result, itemTitle)
        await fetchSessionData()
      } else {
        const error = await response.json()
        toast.error(`❌ ${error.error || 'Erro ao encerrar votação'}`, { id: 'voting-end' })
      }
    } catch (error) {
      toast.error('❌ Erro de conexão ao encerrar votação', { id: 'voting-end' })
    }
  }

  const showVotingResult = async (result: any, title: string) => {
    // Enviar resultado para o painel público por alguns segundos
    try {
      const response = await fetch('/api/admin/show-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          result: {
            ...result,
            title
          }
        })
      })
      
      if (response.ok) {
        toast.success('📊 Resultado enviado para o painel público por 10 segundos')
      }
    } catch (error) {
      console.log('Erro ao mostrar resultado no painel público:', error)
    }
  }

  const handleViewHistory = () => {
    alert('Funcionalidade de Histórico em desenvolvimento!')
  }

  const handleViewDocument = async (_docId: string, docTitle: string, docContent?: string, attachmentUrl?: string) => {
    if (attachmentUrl) {
      window.open(attachmentUrl, '_blank', 'noopener,noreferrer')
      return
    }

    // Criar um modal de visualização ou abrir uma nova janela
    const content = docContent || `Conteúdo do documento: ${docTitle}\n\nEste é um documento da sessão legislativa que será exibido no painel público quando selecionado.`
    
    const newWindow = window.open('', '_blank', 'width=800,height=600')
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Visualizar: ${docTitle}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
              .content { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>${docTitle}</h1>
            <div class="content">
              <pre style="white-space: pre-wrap;">${content}</pre>
            </div>
            <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Fechar</button>
          </body>
        </html>
      `)
      newWindow.document.close()
    }
  }

  const handleViewMatter = async (matterId: string, matterTitle: string) => {
    // Visualizar uma matéria específica
    const content = `Matéria: ${matterTitle}\n\nDescrição: Esta é uma matéria legislativa em tramitação na Câmara de Vereadores.\n\nStatus: Aguardando votação\n\nEsta matéria será submetida à aprovação dos vereadores presentes na sessão.`
    
    const newWindow = window.open('', '_blank', 'width=800,height=600')
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Matéria: ${matterTitle}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              h1 { color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }
              .content { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; }
              .voting-info { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #f59e0b; }
            </style>
          </head>
          <body>
            <h1>${matterTitle}</h1>
            <div class="content">
              <pre style="white-space: pre-wrap;">${content}</pre>
            </div>
            <div class="voting-info">
              <strong>⚠️ Informação de Votação:</strong><br>
              Esta matéria pode ser submetida à votação pelos vereadores presentes na sessão.
            </div>
            <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">Fechar</button>
          </body>
        </html>
      `)
      newWindow.document.close()
    }
  }

  const handleVoteDocument = async (docId: string) => {
    // Confirmar antes de iniciar a votação do documento
    if (!confirm('Deseja iniciar a votação deste documento? A votação será exibida no painel público.')) {
      return
    }

    try {
      toast.loading('Iniciando votação do documento...', { id: 'doc-voting-start' })
      
      const response = await fetch('/api/admin/voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          type: 'document',
          itemId: docId
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('✅ Votação de documento iniciada! Verifique o painel público.', { id: 'doc-voting-start' })
        await fetchSessionData() // Atualizar dados
      } else {
        const error = await response.json()
        toast.error(`❌ ${error.error || 'Erro ao iniciar votação do documento'}`, { id: 'doc-voting-start' })
      }
    } catch (error) {
      toast.error('❌ Erro de conexão ao iniciar votação do documento', { id: 'doc-voting-start' })
      console.error('Erro:', error)
    }
  }

  const handleAddDocument = (phase: string) => {
    setDocumentPhase(phase)
    
    // Fases com lista de tipos usam o primeiro tipo; nas demais o tipo é livre
    const initialType = DOCUMENT_TYPE_OPTIONS_BY_PHASE[phase]?.[0]?.value ?? ''

    setDocumentForm({
      title: '',
      type: initialType,
      content: '',
      sessionId: currentSession?.id || '',
      attachmentName: '',
      attachmentPath: '',
      attachmentUrl: '',
      attachmentMimeType: '',
      selectedAuthors: []
    })
    setIsAddDocumentOpen(true)
  }

  const handleSaveDocument = async () => {
    // Validação básica
    if (!documentForm.title || !documentForm.type || !documentForm.sessionId) {
      toast.error('Por favor, preencha título, tipo e sessão')
      return
    }

    if (!documentForm.content.trim() && !documentForm.attachmentUrl) {
      toast.error('Informe um resumo/conteúdo ou anexe um PDF')
      return
    }

    try {
      toast.loading('Salvando documento...', { id: 'save-document' })
      
      // Converter IDs selecionados em nomes dos autores
      const authorNames = documentForm.selectedAuthors
        .map(id => councilorsForDocument.find(c => c.id === id)?.fullName)
        .filter(Boolean)
        .join(', ')
      
      const response = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: documentForm.title,
          type: documentForm.type,
          content: documentForm.content,
          author: authorNames || null, // null se não houver autores selecionados
          sessionId: documentForm.sessionId,
          phase: documentPhase,
          attachmentName: documentForm.attachmentName || null,
          attachmentPath: documentForm.attachmentPath || null,
          attachmentUrl: documentForm.attachmentUrl || null,
          attachmentMimeType: documentForm.attachmentMimeType || null
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('✅ Documento adicionado com sucesso!', { id: 'save-document' })
        
        // Resetar formulário e fechar modal
        setDocumentForm({
          title: '',
          type: '',
          content: '',
          sessionId: '',
          attachmentName: '',
          attachmentPath: '',
          attachmentUrl: '',
          attachmentMimeType: '',
          selectedAuthors: []
        })
        setDocumentPhase('')
        setIsAddDocumentOpen(false)
        
        // Atualizar lista de documentos
        await fetchSessionData()
      } else {
        const error = await response.json()
        toast.error(`❌ ${error.error || 'Erro ao salvar documento'}`, { id: 'save-document' })
      }
    } catch (error) {
      console.error('Erro ao salvar documento:', error)
      toast.error('❌ Erro de conexão ao salvar documento', { id: 'save-document' })
    }
  }

  const resetDocumentForm = () => {
    setDocumentForm({
      title: '',
      type: '',
      content: '',
      sessionId: '',
      attachmentName: '',
      attachmentPath: '',
      attachmentUrl: '',
      attachmentMimeType: '',
      selectedAuthors: []
    })
    setDocumentPhase('')
    setIsAddDocumentOpen(false)
  }

  const handleApproveSpeech = (speechId: string) => {
    alert(`Aprovando solicitação de fala ID: ${speechId}`)
  }

  const currentPhaseTab = sessionPhases.find((phase) => phaseTabId(phase.key) === activeTab)

  const renderPhaseDocuments = (phase: PhaseDefinition) => {
    const legacyTypes = LEGACY_DOCUMENT_TYPES_BY_PHASE[phase.key] ?? []
    const phaseDocuments = documents.filter(doc => doc.phase === phase.key || legacyTypes.includes(doc.type))
    const lockAfterVote = phase.key !== 'PEQUENO_EXPEDIENTE'
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className={`h-5 w-5 ${phaseColor(phase.color).icon}`} />
            {phase.name} - Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phaseDocuments.length === 0 && (
              <p className="text-sm text-gray-500">Nenhum documento cadastrado nesta fase.</p>
            )}
            {phaseDocuments.map((doc) => (
              <div key={doc.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg">
                <div className="min-w-0">
                  <h4 className="font-medium">{doc.title}</h4>
                  <p className="text-sm text-gray-600">{doc.type}</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewDocument(doc.id, doc.title, doc.content, doc.attachmentUrl)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {doc.attachmentUrl ? 'Abrir PDF' : 'Ver'}
                  </Button>
                  {doc.attachmentUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.attachmentUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  )}
                  {readingDocument === doc.id ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDocumentReading(doc.id, false)}
                    >
                      <StopCircle className="h-4 w-4 mr-1" />
                      Parar Exibição
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => setDocumentReading(doc.id, true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Monitor className="h-4 w-4 mr-1" />
                      Mostrar no Painel
                    </Button>
                  )}
                  {phase.hasVoting && (activeVoting?.type === 'document' && activeVoting?.id === doc.id ? (
                    <Button 
                      size="sm"
                      onClick={() => handleEndVoting('document', doc.id, doc.title)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <StopCircle className="h-4 w-4 mr-1" />
                      Encerrar Votação
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => handleVoteDocument(doc.id)}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={lockAfterVote && doc.isApproved !== null}
                    >
                      <Vote className="h-4 w-4 mr-1" />
                      {lockAfterVote && doc.isApproved !== null ? 'Votado' : 'Votar'}
                    </Button>
                  ))}
                  {votingAgendaPhase && (
                    <Button 
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleMoveToOrdemDoDia(doc.id, doc.title)}
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Para {votingAgendaPhase.name}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t mt-6">
            <Button onClick={() => handleAddDocument(phase.key)}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Documento
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderVotingAgenda = (phase: PhaseDefinition) => {
    const agendaDocuments = documents.filter(doc => doc.isOrdemDoDia)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className={`h-5 w-5 ${phaseColor(phase.color).icon}`} />
            {phase.name} - Documentos para Votação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agendaDocuments.length === 0 ? (
            <div className="text-center py-12">
              <Vote className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-600">Nenhum documento em {phase.name}</h3>
              <p className="text-gray-500">
                Use o botão &quot;Para {phase.name}&quot; nos documentos das outras fases
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {agendaDocuments.map((doc) => (
                <div key={doc.id} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-4 border rounded-lg bg-red-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{doc.title}</h4>
                      <Badge className="bg-red-600">{doc.type}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {doc.author && `Autor: ${doc.author}`}
                    </p>
                    {doc.isApproved !== null && (
                      <Badge 
                        variant={doc.isApproved ? "default" : "destructive"}
                        className="mt-2"
                      >
                        {doc.isApproved ? '✓ Aprovado' : '✗ Rejeitado'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDocument(doc.id, doc.title, doc.content, doc.attachmentUrl)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {doc.attachmentUrl ? 'Abrir PDF' : 'Ver'}
                    </Button>
                    {doc.attachmentUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.attachmentUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    )}
                    {readingDocument === doc.id ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDocumentReading(doc.id, false)}
                      >
                        <StopCircle className="h-4 w-4 mr-1" />
                        Parar Exibição
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => setDocumentReading(doc.id, true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Monitor className="h-4 w-4 mr-1" />
                        Mostrar no Painel
                      </Button>
                    )}
                    {phase.hasVoting && (activeVoting?.type === 'document' && activeVoting?.id === doc.id ? (
                      <Button 
                        size="sm"
                        onClick={() => handleEndVoting('document', doc.id, doc.title)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <StopCircle className="h-4 w-4 mr-1" />
                        Encerrar Votação
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleVoteDocument(doc.id)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={doc.isApproved !== null}
                      >
                        <Vote className="h-4 w-4 mr-1" />
                        {doc.isApproved !== null ? 'Votado' : 'Votar'}
                      </Button>
                    ))}
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFromOrdemDoDia(doc.id, doc.title)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const activeTabInfo = menuItems.find((item) => item.id === activeTab)

  const renderSidebar = ({
    collapsed,
    showCollapseToggle,
    sticky,
    onNavigate,
  }: {
    collapsed: boolean
    showCollapseToggle: boolean
    sticky: boolean
    onNavigate?: () => void
  }) => (
    <div
      className={cn(
        "bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden",
        sticky && "sticky top-4"
      )}
    >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-white" />
            <span className="font-semibold text-white text-sm">Menu Admin</span>
          </div>
        )}
        {showCollapseToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <nav className="p-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          if ((item as any).href) {
            return (
              <Link
                key={item.id}
                href={(item as any).href}
                onClick={onNavigate}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-gray-100 group",
                  isActive && "bg-blue-50 border border-blue-200 shadow-sm",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors",
                    item.color
                  )}
                />
                {!collapsed && (
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors truncate",
                      "text-gray-600 group-hover:text-gray-900"
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                onNavigate?.()
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-gray-100 group",
                isActive && "bg-blue-50 border border-blue-200 shadow-sm",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? item.color : "text-gray-500 group-hover:text-gray-700"
                )}
              />
              {!collapsed && (
                <span
                  className={cn(
                    "text-sm font-medium transition-colors truncate",
                    isActive
                      ? "text-gray-900"
                      : "text-gray-600 group-hover:text-gray-900"
                  )}
                >
                  {item.label}
                </span>
              )}
              {!collapsed && isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onNavigate?.()
              window.open("/painel", "_blank")
            }}
            className="w-full justify-start gap-2 text-xs"
          >
            <Eye className="h-3.5 w-3.5" />
            Abrir Painel Público
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Controle de Sessão - Administrador
          </h1>
          <p className="text-gray-600">
            Gestão completa das fases da sessão e controle do painel público
          </p>
        </div>

        {/* Session Status */}
        {!currentSession ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <Calendar className="h-6 w-6 text-yellow-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">
                    Nenhuma sessão ativa
                  </h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Não há nenhuma sessão ativa no momento. Crie uma nova sessão para começar.
                  </p>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                      <Dialog open={isCreateSessionOpen} onOpenChange={setIsCreateSessionOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Nova Sessão
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Criar Nova Sessão</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Título da Sessão (opcional)
                              </label>
                              <Input
                                value={sessionForm.title}
                                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                                placeholder="Deixe em branco para gerar automaticamente"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Data da Sessão
                              </label>
                              <Input
                                type="date"
                                value={sessionForm.date}
                                onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                              />
                            </div>
                            <Button 
                              onClick={handleCreateSession}
                              className="w-full"
                            >
                              Criar Sessão
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {scheduledSessions.length > 0 && (
                        <Button 
                          onClick={handleStartSessionClick}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Iniciar Sessão
                        </Button>
                      )}
                    </div>

                    <Dialog open={isSelectSessionOpen} onOpenChange={setIsSelectSessionOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Selecione uma Sessão para Iniciar</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                          {scheduledSessions.map((session) => (
                            <Button
                              key={session.id}
                              variant="outline"
                              className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-green-50 hover:border-green-200"
                              onClick={() => handleSessionControl('start', session.id)}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <Calendar className="h-5 w-5 text-green-600 flex-shrink-0" />
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    {session.sessionNumber ? `Sessão ${session.sessionNumber} - ` : ''}{session.title}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Agendada para: {new Date(session.scheduledAt).toLocaleDateString('pt-BR')} às {new Date(session.scheduledAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">
                    {currentSession?.title || 'Sessão Nº ' + (currentSession?.sessionNumber || '001')}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Fase atual: {getPhaseTitle(sessionPhase)} • Administrador controla todas as etapas
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={sessionPhase === 'SCHEDULED' ? 'secondary' : 'default'}>
                  {getPhaseTitle(sessionPhase)}
                </Badge>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('/painel', '_blank')}
                  className="flex items-center gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  Ver Painel Público
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Layout com Menu Lateral */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-3 pt-10">
                {renderSidebar({
                  collapsed: false,
                  showCollapseToggle: false,
                  sticky: false,
                  onNavigate: () => setMobileMenuOpen(false),
                })}
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {activeTabInfo?.label || "Menu"}
              </div>
              {currentSession && (
                <div className="text-xs text-gray-600 truncate">
                  {currentSession?.title ||
                    "Sessão Nº " + (currentSession?.sessionNumber || "001")}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <aside className={cn(
              "hidden md:block flex-shrink-0 transition-all duration-300 ease-in-out",
              sidebarCollapsed ? "w-16" : "w-64"
            )}>
              {renderSidebar({
                collapsed: sidebarCollapsed,
                showCollapseToggle: true,
                sticky: true,
              })}
            </aside>

            <main className="flex-1 min-w-0">
          {/* CONTROLE DO PAINEL PÚBLICO */}
          {activeTab === 'painel' && <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-blue-600" />
                  Controle do Painel Público
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Controle de Documentos em Leitura */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Documento sendo Exibido
                  </h4>
                  
                  <div className="grid gap-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg">
                        <div className="min-w-0">
                          <h5 className="font-medium">{doc.title}</h5>
                          <p className="text-sm text-gray-600">{doc.type} - {doc.author || 'Autor não informado'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          {readingDocument === doc.id ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDocumentReading(doc.id, false)}
                            >
                              <StopCircle className="h-4 w-4 mr-1" />
                              Parar Leitura
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDocumentReading(doc.id, true)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Exibir no Painel
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Controle de Timer */}
                <div className="border-t pt-6 space-y-4">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    Timer para {councilorSpeechPhaseName}
                  </h4>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Duração (minutos):</label>
                      <Input
                        type="number"
                        value={Math.floor(timerDuration / 60)}
                        onChange={(e) => setTimerDuration(parseInt(e.target.value) * 60)}
                        className="w-20"
                        min="1"
                        max="30"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      {!timerActive ? (
                        <Button
                          onClick={() => handleTimerControl('start')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Iniciar Timer
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          onClick={() => handleTimerControl('stop')}
                        >
                          <StopCircle className="h-4 w-4 mr-1" />
                          Parar Timer
                        </Button>
                      )}
                    </div>
                  </div>

                  {timerActive && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-orange-800 font-medium">
                        ⏱️ Timer ativo no painel público - {councilorSpeechPhaseName}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status do Painel */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold mb-3">Status Atual do Painel</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <strong>Fase:</strong> {getPhaseTitle(sessionPhase)}
                      </div>
                      <div>
                        <strong>Documento:</strong> {readingDocument ? 'Em exibição' : 'Nenhum'}
                      </div>
                      <div>
                        <strong>Timer:</strong> {timerActive ? 'Ativo' : 'Parado'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>}

          {/* VISÃO GERAL */}
          {activeTab === 'overview' && <div className="space-y-6">
            {/* Controle Principal da Sessão */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-blue-600" />
                  Controle Principal da Sessão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  {/* Iniciar/Encerrar Sessão */}
                  {sessionPhase === 'SCHEDULED' ? (
                    <Button 
                      onClick={() => handleSessionControl('start')}
                      className="h-16 bg-green-600 hover:bg-green-700 flex flex-col items-center"
                      disabled={!currentSession}
                    >
                      <Play className="h-6 w-6 mb-1" />
                      <span className="text-sm">Iniciar Sessão</span>
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleSessionControl('end')}
                      className="h-16 bg-red-600 hover:bg-red-700 flex flex-col items-center"
                      disabled={!currentSession}
                    >
                      <StopCircle className="h-6 w-6 mb-1" />
                      <span className="text-sm">Encerrar Sessão</span>
                    </Button>
                  )}
                  
                  {/* Controle de Quórum */}
                  {sessionPhase !== 'SCHEDULED' && sessionPhase !== 'CLOSED' && (
                    attendanceOpen ? (
                      <Button 
                        onClick={() => handleAttendanceControl('end')}
                        className="h-16 bg-orange-600 hover:bg-orange-700 flex flex-col items-center"
                      >
                        <CheckCircle className="h-6 w-6 mb-1" />
                        <span className="text-sm">Fechar Chamada</span>
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleAttendanceControl('start')}
                        className="h-16 bg-blue-600 hover:bg-blue-700 flex flex-col items-center"
                      >
                        <Users className="h-6 w-6 mb-1" />
                        <span className="text-sm">Abrir Chamada</span>
                      </Button>
                    )
                  )}

                  {/* Ver Painel Público */}
                  <Button 
                    variant="outline"
                    onClick={() => window.open('/painel', '_blank')}
                    className="h-16 flex flex-col items-center hover:bg-gray-50"
                  >
                    <Monitor className="h-6 w-6 mb-1" />
                    <span className="text-sm">Ver Painel Público</span>
                  </Button>
                </div>

                {/* Status atual */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Status da Sessão:</strong> {getPhaseTitle(sessionPhase)}
                    </div>
                    <div>
                      <strong>Chamada:</strong> {attendanceOpen ? 'Aberta' : 'Fechada'}
                    </div>
                    <div>
                      <strong>Timer:</strong> {timerActive ? 'Ativo' : 'Parado'}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-blue-700">
                    A chamada de presença pode ficar aberta durante toda a sessão para registrar vereadores que chegarem depois.
                  </p>
                </div>

                {/* Controle de Votação Ativa */}
                {activeVoting && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <Vote className="h-6 w-6 text-red-600" />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-red-800">
                            🗳️ VOTAÇÃO EM ANDAMENTO
                          </h3>
                          <p className="text-sm text-red-600">
                            {activeVoting.title} ({activeVoting.type === 'matter' ? 'Matéria' : 'Documento'})
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                            <span className="text-green-700">✅ Favorável: {activeVoting.votes.yes}</span>
                            <span className="text-red-700">❌ Contrário: {activeVoting.votes.no}</span>
                            <span className="text-yellow-700">⚪ Abstenção: {activeVoting.votes.abstention}</span>
                            <span className="text-gray-700">Total: {activeVoting.votes.yes + activeVoting.votes.no + activeVoting.votes.abstention}/{activeVoting.totalVoters}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleEndVoting(activeVoting.type, activeVoting.id, activeVoting.title)}
                        className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                      >
                        <StopCircle className="h-4 w-4 mr-1" />
                        Encerrar Votação
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Controle das Fases */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-green-600" />
                  Controle das Fases da Sessão
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">Clique para iniciar a fase e abrir sua gestão</p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessionPhases.map((phase) => {
                    const Icon = phaseIcon(phase)
                    const colors = phaseColor(phase.color)
                    const isCurrent = sessionPhase === phase.key
                    return (
                      <div
                        key={phase.id}
                        onClick={() => startPhase(phase.key, true)}
                        className={`h-24 rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                          isCurrent ? colors.activeCard : `bg-white border-gray-200 ${colors.card}`
                        }`}
                      >
                        <Icon className={`h-6 w-6 ${isCurrent ? colors.icon : 'text-gray-500'}`} />
                        <span className="font-medium text-sm text-center px-2">{phase.name}</span>
                        {isCurrent && (
                          <Badge className={`${colors.badge} text-[10px]`}>ATIVO</Badge>
                        )}
                      </div>
                    )
                  })}
                  <div 
                    onClick={() => startPhase('CLOSED')}
                    className="h-24 rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 bg-white border-gray-200 hover:border-gray-500 hover:bg-gray-100"
                  >
                    <CheckCircle className="h-6 w-6 text-gray-500" />
                    <span className="font-medium text-sm text-gray-700">Encerrar Sessão</span>
                  </div>
                </div>
                {sessionPhases.length === 0 && (
                  <p className="text-sm text-gray-500 mt-4">
                    Nenhuma fase cadastrada. Use o menu &quot;Configurar Fases&quot; para cadastrar as fases da sessão.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Vereadores</p>
                      <p className="text-2xl font-bold">{attendanceData.totalCount}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className={attendanceData.hasQuorum ? 'border-green-400 bg-green-50' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Presenças</p>
                      <p className="text-2xl font-bold">{attendanceData.presentCount}</p>
                      {attendanceData.hasQuorum && (
                        <p className="text-xs text-green-600 font-medium">✓ Quórum atingido</p>
                      )}
                    </div>
                    <CheckCircle className={`h-8 w-8 ${attendanceData.hasQuorum ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Matérias</p>
                      <p className="text-2xl font-bold">{documents.filter(d => d.isOrdemDoDia).length}</p>
                    </div>
                    <Vote className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Status</p>
                      <p className={`text-xl font-bold ${sessionPhase === 'CLOSED' ? 'text-gray-500' : 'text-green-600'}`}>
                        {sessionPhase === 'CLOSED' ? 'Encerrada' : 'Ativo'}
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {attendanceOpen && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Gestão da Chamada
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Justifique faltas durante a chamada aberta. Se o vereador marcar presença depois, a justificativa é removida automaticamente.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {attendanceData.attendances.map((attendance) => (
                      <div
                        key={attendance.id}
                        className={`rounded-xl border p-4 shadow-sm transition-colors ${
                          attendance.isPresent
                            ? 'border-green-200 bg-green-50'
                            : attendance.absenceJustification
                              ? 'border-amber-200 bg-amber-50'
                              : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{attendance.user.fullName}</h4>
                            <p className="text-xs text-gray-500">
                              {attendance.user.party || attendance.user.role}
                            </p>
                          </div>
                          <Badge
                            className={
                              attendance.isPresent
                                ? 'bg-green-600'
                                : attendance.absenceJustification
                                  ? 'bg-amber-500'
                                  : 'bg-gray-500'
                            }
                          >
                            {attendance.isPresent
                              ? 'Presente'
                              : attendance.absenceJustification
                                ? 'Falta Justificada'
                                : 'Ausente'}
                          </Badge>
                        </div>

                        {attendance.isPresent ? (
                          <p className="mt-3 text-sm text-green-700">
                            Presença registrada às{' '}
                            {attendance.arrivedAt
                              ? new Date(attendance.arrivedAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '--:--'}
                          </p>
                        ) : attendance.absenceJustification ? (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-white/70 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                              Justificativa
                            </p>
                            <p className="mt-1 text-sm text-gray-700">{attendance.absenceJustification}</p>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-gray-600">
                            Ainda sem presença registrada e sem justificativa.
                          </p>
                        )}

                        {!attendance.isPresent && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={attendance.absenceJustification ? 'outline' : 'default'}
                              onClick={() => openAttendanceJustification(attendance)}
                            >
                              {attendance.absenceJustification ? 'Editar justificativa' : 'Justificar falta'}
                            </Button>
                            {attendance.absenceJustification && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveAttendanceJustification(attendance)}
                              >
                                Remover
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>}

          {/* FASES DA SESSÃO */}
          {currentPhaseTab && <div className="space-y-6">
            {currentPhaseTab.hasDocuments && renderPhaseDocuments(currentPhaseTab)}
            {currentPhaseTab.isVotingAgenda && renderVotingAgenda(currentPhaseTab)}
            {currentPhaseTab.speechType === 'CONSIDERACOES_FINAIS' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className={`h-5 w-5 ${phaseColor(currentPhaseTab.color).icon}`} />
                    {currentPhaseTab.name} - Solicitações de Fala
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ConsideracoesFinaisTab phaseName={currentPhaseTab.name} />
                </CardContent>
              </Card>
            )}
            {currentPhaseTab.speechType === 'TRIBUNA_LIVE' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className={`h-5 w-5 ${phaseColor(currentPhaseTab.color).icon}`} />
                    {currentPhaseTab.name} - Manifestações Públicas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TribunaLivreTab phaseName={currentPhaseTab.name} />
                </CardContent>
              </Card>
            )}
            {!currentPhaseTab.hasDocuments && !currentPhaseTab.isVotingAgenda && !currentPhaseTab.speechType && (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <ScrollText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">{currentPhaseTab.name}</p>
                  <p className="text-sm">Esta fase não tem documentos, pauta de votação nem inscrições de fala configurados.</p>
                </CardContent>
              </Card>
            )}
          </div>}

          {/* CONFIGURAÇÃO DAS FASES */}
          {activeTab === 'fases' && <div className="space-y-6">
            <PhasesManager phases={sessionPhases} currentPhaseKey={sessionPhase} onChange={refreshPhases} />
          </div>}

          {/* GESTÃO DE VEREADORES */}
          {activeTab === 'vereadores' && <div className="space-y-6">
            <VereadoresTab />
          </div>}

          {/* GESTÃO DE SESSÕES */}
          {activeTab === 'sessoes' && <div className="space-y-6">
            <SessoesTab />
          </div>}
          </main>
        </div>
        </div>
        
        {/* Modal para Adicionar Documentos */}
        <Dialog open={isAddDocumentOpen} onOpenChange={setIsAddDocumentOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Documento</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Sessão Legislativa */}
              <div>
                <label className="text-sm font-medium block mb-1">Sessão Legislativa *</label>
                <Select
                  value={documentForm.sessionId}
                  onValueChange={(value) => setDocumentForm({...documentForm, sessionId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a sessão" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSessions.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhuma sessão disponível</SelectItem>
                    ) : (
                      availableSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.sessionNumber ? `Sessão ${session.sessionNumber} - ` : ''}{session.title} ({new Date(session.scheduledAt).toLocaleDateString('pt-BR')}) {session.status === 'CLOSED' ? '[Encerrada]' : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Título do Documento */}
              <div>
                <label className="text-sm font-medium block mb-1">Título do Documento *</label>
                <Input
                  value={documentForm.title}
                  onChange={(e) => setDocumentForm({...documentForm, title: e.target.value})}
                  placeholder="Ex: Projeto de Lei 001/2024 - Alteração do Código Tributário"
                  className="w-full"
                />
              </div>
              
              {/* Tipo de Documento */}
              <div>
                <label className="text-sm font-medium block mb-1">Tipo de Documento *</label>
                {!DOCUMENT_TYPE_OPTIONS_BY_PHASE[documentPhase] ? (
                  <Input
                    value={documentForm.type}
                    onChange={(e) => setDocumentForm({...documentForm, type: e.target.value})}
                    placeholder="Digite o tipo do documento (ex: Ata, Leitura de Ofício)"
                    className="w-full"
                  />
                ) : (
                  <Select 
                    value={documentForm.type} 
                    onValueChange={(value) => setDocumentForm({...documentForm, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPE_OPTIONS_BY_PHASE[documentPhase].map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {/* Autor/Proponente */}
              <div>
                <label className="text-sm font-medium block mb-2">Autor/Proponente (opcional)</label>
                <p className="text-xs text-gray-500 mb-2">
                  Selecione um ou mais vereadores. Deixe em branco para documentos sem proponente (ex: atas).
                </p>
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 bg-gray-50 space-y-2">
                  {councilorsForDocument.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">Carregando vereadores...</p>
                  ) : (
                    councilorsForDocument.map((councilor) => (
                      <label 
                        key={councilor.id} 
                        className="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={documentForm.selectedAuthors.includes(councilor.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDocumentForm({
                                ...documentForm,
                                selectedAuthors: [...documentForm.selectedAuthors, councilor.id]
                              })
                            } else {
                              setDocumentForm({
                                ...documentForm,
                                selectedAuthors: documentForm.selectedAuthors.filter(id => id !== councilor.id)
                              })
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {councilor.photoUrl ? (
                            <img 
                              src={councilor.photoUrl} 
                              alt={councilor.fullName}
                              className="w-8 h-8 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium">
                              {councilor.fullName?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{councilor.fullName}</p>
                            {councilor.party && (
                              <p className="text-xs text-gray-500">{councilor.party}</p>
                            )}
                          </div>
                          {councilor.role === 'PRESIDENT' && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                              Presidente
                            </span>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {documentForm.selectedAuthors.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    {documentForm.selectedAuthors.length} selecionado(s): {
                      documentForm.selectedAuthors
                        .map(id => councilorsForDocument.find(c => c.id === id)?.fullName)
                        .filter(Boolean)
                        .join(', ')
                    }
                  </p>
                )}
              </div>
              
              {/* Conteúdo do Documento */}
              <div>
                <label className="text-sm font-medium block mb-1">Conteúdo do Documento (opcional)</label>
                <Textarea
                  value={documentForm.content}
                  onChange={(e) => setDocumentForm({...documentForm, content: e.target.value})}
                  placeholder="Descreva o conteúdo principal do documento ou deixe um resumo para acompanhar o PDF..."
                  className="w-full min-h-[120px]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Você pode salvar com texto, com PDF, ou com ambos.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Anexo em PDF (opcional)</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleDocumentPdfUpload(file)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                    <Button type="button" variant="outline" disabled={uploadingDocumentPdf} asChild>
                      <span>
                        {uploadingDocumentPdf ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Enviar PDF
                      </span>
                    </Button>
                  </label>
                  {documentForm.attachmentName ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-green-700">
                      <span>{documentForm.attachmentName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(documentForm.attachmentUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Abrir
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDocumentForm({
                          ...documentForm,
                          attachmentName: '',
                          attachmentPath: '',
                          attachmentUrl: '',
                          attachmentMimeType: ''
                        })}
                      >
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Anexe o arquivo oficial em PDF para consulta dos vereadores na sessão atual.
                    </p>
                  )}
                </div>
              </div>
              
              {/* Fase (somente leitura) */}
              <div>
                <label className="text-sm font-medium block mb-1">Fase da Sessão</label>
                <Input
                  value={documentPhase.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  disabled
                  className="w-full bg-gray-100"
                />
              </div>
            </div>
            
            {/* Botões de Ação */}
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSaveDocument}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Salvar Documento
              </Button>
              <Button 
                variant="outline"
                onClick={resetDocumentForm}
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isAttendanceJustificationOpen}
          onOpenChange={(open) => {
            setIsAttendanceJustificationOpen(open)
            if (!open) {
              setSelectedAttendance(null)
              setAbsenceJustification('')
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedAttendance?.absenceJustification ? 'Editar justificativa de falta' : 'Justificar falta'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900">
                  {selectedAttendance?.user?.fullName || 'Vereador'}
                </p>
                <p className="text-xs text-amber-700">
                  Registre o motivo da ausência para exibição no painel durante a chamada.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Justificativa</label>
                <Textarea
                  value={absenceJustification}
                  onChange={(e) => setAbsenceJustification(e.target.value)}
                  placeholder="Ex: compromisso oficial, atestado médico, viagem institucional..."
                  className="min-h-[120px]"
                  maxLength={500}
                />
                <p className="mt-1 text-right text-xs text-gray-500">
                  {absenceJustification.length}/500
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveAttendanceJustification}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Salvar justificativa
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAttendanceJustificationOpen(false)
                    setSelectedAttendance(null)
                    setAbsenceJustification('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Seleção de Sessão para Iniciar */}
        <Dialog open={isSelectSessionOpen} onOpenChange={setIsSelectSessionOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Iniciar Sessão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-500 mb-2">
                Selecione qual das sessões agendadas você deseja iniciar:
              </p>
              {scheduledSessions.length === 0 ? (
                <p className="text-center text-gray-500">Nenhuma sessão agendada disponível.</p>
              ) : (
                scheduledSessions.map((session) => (
                  <Button
                    key={session.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-4 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-colors"
                    onClick={() => handleSessionControl('start', session.id)}
                  >
                    <div className="text-left w-full">
                      <div className="font-medium">{session.title}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(session.scheduledAt).toLocaleDateString('pt-BR')}
                        {session.sessionNumber && ` • Sessão Nº ${session.sessionNumber}`}
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
