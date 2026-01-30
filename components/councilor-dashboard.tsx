"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "react-hot-toast"
import { 
  UserCheck,
  Vote,
  Clock,
  CheckCircle,
  XCircle,
  Minus,
  Info,
  MessageSquare,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Hand,
  Users,
  FileText,
  Loader2
} from "lucide-react"

// Tipos
interface SessionData {
  id: string
  sessionNumber: string
  status: string
  date: string
  isAttendanceOpen: boolean
  isSpeechRequestsOpen: boolean
  quorum: number
}

interface PresenceData {
  isPresent: boolean
  arrivedAt: string | null
  presentCount: number
  totalCount: number
  hasQuorum: boolean
}

interface VotingData {
  type: 'document' | 'matter'
  id: string
  title: string
  description: string
  documentType?: string
  votes: {
    yes: number
    no: number
    abstention: number
  }
  isActive: boolean
}

interface SpeechRequest {
  id: string
  subject: string
  type: string
  isApproved: boolean
  hasSpoken: boolean
  isSpeaking: boolean
  createdAt: string
}

interface CouncilorStatus {
  hasActiveSession: boolean
  session: SessionData | null
  presence: PresenceData | null
  currentVoting: VotingData | null
  myVote: 'YES' | 'NO' | 'ABSTENTION' | null
  speechRequests: SpeechRequest[]
  queuePosition: number | null
}

// Mapeamento de fases
const phaseLabels: Record<string, string> = {
  'SCHEDULED': 'Agendada',
  'PEQUENO_EXPEDIENTE': 'Pequeno Expediente',
  'GRANDE_EXPEDIENTE': 'Grande Expediente',
  'ORDEM_DO_DIA': 'Ordem do Dia',
  'CONSIDERACOES_FINAIS': 'Considerações Finais',
  'TRIBUNA_LIVE': 'Tribuna Livre',
  'CLOSED': 'Encerrada'
}

const phaseColors: Record<string, string> = {
  'SCHEDULED': 'bg-gray-500',
  'PEQUENO_EXPEDIENTE': 'bg-blue-500',
  'GRANDE_EXPEDIENTE': 'bg-purple-500',
  'ORDEM_DO_DIA': 'bg-orange-500',
  'CONSIDERACOES_FINAIS': 'bg-green-500',
  'TRIBUNA_LIVE': 'bg-amber-500',
  'CLOSED': 'bg-gray-700'
}

export function CouncilorDashboard() {
  const { data: session } = useSession() || {}
  const [status, setStatus] = useState<CouncilorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [votingInProgress, setVotingInProgress] = useState(false)
  const [presenceLoading, setPresenceLoading] = useState(false)
  const [speechLoading, setSpeechLoading] = useState(false)
  const [speechSubject, setSpeechSubject] = useState('')
  const [voteConfirmDialog, setVoteConfirmDialog] = useState<{
    open: boolean
    voteType: 'YES' | 'NO' | 'ABSTENTION' | null
  }>({ open: false, voteType: null })

  // Buscar status do vereador
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/councilor/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Polling a cada 3 segundos
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // Marcar presença
  const handleMarkPresence = async () => {
    setPresenceLoading(true)
    try {
      const response = await fetch('/api/councilor/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        toast.success('Presença registrada com sucesso!')
        await fetchStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao registrar presença')
      }
    } catch (error) {
      toast.error('Erro ao registrar presença')
    } finally {
      setPresenceLoading(false)
    }
  }

  // Votar
  const handleVote = async (voteType: 'YES' | 'NO' | 'ABSTENTION') => {
    if (!status?.currentVoting) return

    setVotingInProgress(true)
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: status.currentVoting.type,
          itemId: status.currentVoting.id,
          voteType
        })
      })

      if (response.ok) {
        const voteLabels = { YES: 'SIM', NO: 'NÃO', ABSTENTION: 'ABSTENÇÃO' }
        toast.success(`Voto "${voteLabels[voteType]}" registrado com sucesso!`)
        await fetchStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao registrar voto')
      }
    } catch (error) {
      toast.error('Erro ao registrar voto')
    } finally {
      setVotingInProgress(false)
      setVoteConfirmDialog({ open: false, voteType: null })
    }
  }

  // Solicitar fala
  const handleSpeechRequest = async () => {
    if (!speechSubject.trim()) {
      toast.error('Informe o assunto da fala')
      return
    }

    setSpeechLoading(true)
    try {
      const response = await fetch('/api/speech-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: speechSubject,
          type: 'CONSIDERACOES_FINAIS'
        })
      })

      if (response.ok) {
        toast.success('Solicitação de fala enviada!')
        setSpeechSubject('')
        await fetchStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao solicitar fala')
      }
    } catch (error) {
      toast.error('Erro ao solicitar fala')
    } finally {
      setSpeechLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // Sem sessão ativa
  if (!status?.hasActiveSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Painel do Vereador
            </h1>
            <p className="text-gray-600">
              Bem-vindo(a), {session?.user?.name}
            </p>
          </div>

          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Clock className="h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Nenhuma Sessão Ativa
              </h2>
              <p className="text-gray-500 text-center max-w-md">
                Aguarde o Presidente da Câmara abrir uma nova sessão legislativa para participar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { session: sessionData, presence, currentVoting, myVote, speechRequests, queuePosition } = status

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <div className="container max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            Painel do Vereador
          </h1>
          <p className="text-gray-600">
            Bem-vindo(a), {session?.user?.name}
          </p>
        </div>

        {/* ============================================= */}
        {/* SEÇÃO 1: STATUS DA SESSÃO */}
        {/* ============================================= */}
        <Card className="mb-6 border-l-4 border-l-blue-600 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Sessão {sessionData?.sessionNumber || 'Atual'}
                </CardTitle>
                <CardDescription>
                  {sessionData?.date && new Date(sessionData.date).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </CardDescription>
              </div>
              <Badge 
                className={`${phaseColors[sessionData?.status || '']} text-white text-sm px-3 py-1`}
              >
                {phaseLabels[sessionData?.status || ''] || sessionData?.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">
                  Presentes: <strong className="text-gray-900">{presence?.presentCount}/{presence?.totalCount}</strong>
                </span>
                {presence?.hasQuorum ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Quórum OK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Sem Quórum
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============================================= */}
        {/* SEÇÃO 2: MARCAÇÃO DE PRESENÇA */}
        {/* ============================================= */}
        <Card className={`mb-6 transition-all duration-300 ${
          sessionData?.isAttendanceOpen && !presence?.isPresent
            ? 'border-2 border-orange-400 bg-orange-50 shadow-md animate-pulse'
            : presence?.isPresent
              ? 'border-2 border-green-400 bg-green-50'
              : 'border border-gray-200'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className={`h-5 w-5 ${presence?.isPresent ? 'text-green-600' : 'text-gray-600'}`} />
              Registro de Presença
              {sessionData?.isAttendanceOpen && !presence?.isPresent && (
                <Badge className="bg-orange-500 text-white animate-pulse">
                  CHAMADA ABERTA
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {presence?.isPresent ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">Presente ✅</p>
                  <p className="text-sm text-gray-600">
                    Registrado às {presence.arrivedAt && new Date(presence.arrivedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ) : sessionData?.isAttendanceOpen ? (
              <div className="space-y-4">
                <Alert className="border-orange-300 bg-orange-100">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Atenção!</strong> A chamada está aberta. Registre sua presença agora.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleMarkPresence}
                  disabled={presenceLoading}
                  size="lg"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {presenceLoading ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <UserCheck className="h-5 w-5 mr-2" />
                  )}
                  Marcar Presença
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium">Chamada Fechada</p>
                  <p className="text-sm">Aguarde a abertura da chamada pelo presidente.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============================================= */}
        {/* SEÇÃO 3: VOTAÇÃO (ORDEM DO DIA) */}
        {/* ============================================= */}
        <Card className={`mb-6 transition-all duration-300 ${
          currentVoting?.isActive && !myVote
            ? 'border-2 border-purple-400 bg-purple-50 shadow-lg'
            : 'border border-gray-200'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Vote className={`h-5 w-5 ${currentVoting?.isActive ? 'text-purple-600' : 'text-gray-600'}`} />
              Painel de Votação
              {currentVoting?.isActive && !myVote && (
                <Badge className="bg-purple-600 text-white animate-pulse">
                  VOTAÇÃO ABERTA
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionData?.status !== 'ORDEM_DO_DIA' && !currentVoting ? (
              <div className="text-center py-8 text-gray-500">
                <Vote className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Aguardando Ordem do Dia</p>
                <p className="text-sm">A votação será habilitada durante a fase "Ordem do Dia".</p>
              </div>
            ) : !currentVoting?.isActive ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Nenhuma Matéria em Votação</p>
                <p className="text-sm">Aguarde o administrador iniciar uma votação.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Matéria em votação */}
                <div className="p-4 bg-white rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {currentVoting.title}
                  </h3>
                  {currentVoting.description && (
                    <p className="text-sm text-gray-600">{currentVoting.description}</p>
                  )}
                  {currentVoting.documentType && (
                    <Badge variant="outline" className="mt-2">
                      {currentVoting.documentType.replace('_', ' ')}
                    </Badge>
                  )}
                </div>

                {/* Já votou */}
                {myVote ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-semibold text-blue-800">Voto Registrado</p>
                        <p className="text-sm text-blue-600">
                          Seu voto: <strong>{
                            myVote === 'YES' ? '👍 SIM' :
                            myVote === 'NO' ? '👎 NÃO' :
                            '🤍 ABSTENÇÃO'
                          }</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Botões de votação */
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 font-medium">Registre seu voto:</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        onClick={() => setVoteConfirmDialog({ open: true, voteType: 'YES' })}
                        disabled={votingInProgress}
                        size="lg"
                        className="h-20 flex flex-col gap-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <ThumbsUp className="h-6 w-6" />
                        <span className="font-bold">SIM</span>
                      </Button>
                      <Button
                        onClick={() => setVoteConfirmDialog({ open: true, voteType: 'NO' })}
                        disabled={votingInProgress}
                        size="lg"
                        className="h-20 flex flex-col gap-1 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <ThumbsDown className="h-6 w-6" />
                        <span className="font-bold">NÃO</span>
                      </Button>
                      <Button
                        onClick={() => setVoteConfirmDialog({ open: true, voteType: 'ABSTENTION' })}
                        disabled={votingInProgress}
                        size="lg"
                        variant="outline"
                        className="h-20 flex flex-col gap-1 border-2 border-gray-400 hover:bg-gray-100"
                      >
                        <Minus className="h-6 w-6" />
                        <span className="font-bold">ABST.</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Contador de votos */}
                <div className="flex justify-around p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="text-center">
                    <span className="font-bold text-green-600 text-lg">{currentVoting.votes.yes}</span>
                    <p className="text-gray-500">Sim</p>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-red-600 text-lg">{currentVoting.votes.no}</span>
                    <p className="text-gray-500">Não</p>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-gray-600 text-lg">{currentVoting.votes.abstention}</span>
                    <p className="text-gray-500">Abst.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============================================= */}
        {/* SEÇÃO 4: CONSIDERAÇÕES FINAIS - INSCRIÇÃO */}
        {/* ============================================= */}
        <Card className={`mb-6 transition-all duration-300 ${
          sessionData?.isSpeechRequestsOpen
            ? 'border-2 border-green-400 bg-green-50'
            : 'border border-gray-200'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className={`h-5 w-5 ${sessionData?.isSpeechRequestsOpen ? 'text-green-600' : 'text-gray-600'}`} />
              Considerações Finais
              {sessionData?.isSpeechRequestsOpen && (
                <Badge className="bg-green-600 text-white">
                  INSCRIÇÕES ABERTAS
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionData?.status !== 'CONSIDERACOES_FINAIS' && !sessionData?.isSpeechRequestsOpen ? (
              <div className="text-center py-6 text-gray-500">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="font-medium">Aguardando Considerações Finais</p>
                <p className="text-sm">As inscrições serão abertas durante esta fase.</p>
              </div>
            ) : !sessionData?.isSpeechRequestsOpen ? (
              <div className="flex items-center gap-3 text-gray-500">
                <XCircle className="h-5 w-5" />
                <span>Inscrições fechadas no momento.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Formulário de inscrição */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    value={speechSubject}
                    onChange={(e) => setSpeechSubject(e.target.value)}
                    placeholder="Assunto da fala (ex: Transporte público)"
                    className="flex-1"
                    disabled={speechLoading}
                  />
                  <Button
                    onClick={handleSpeechRequest}
                    disabled={speechLoading || !speechSubject.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {speechLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Hand className="h-4 w-4 mr-2" />
                    )}
                    Solicitar Fala
                  </Button>
                </div>

                {/* Posição na fila */}
                {queuePosition && (
                  <Alert className="border-blue-300 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Você está na posição <strong>{queuePosition}º</strong> da fila de oradores.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Minhas solicitações */}
                {speechRequests.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Minhas Solicitações:</p>
                    {speechRequests.map((req) => (
                      <div
                        key={req.id}
                        className={`p-3 rounded-lg border ${
                          req.isSpeaking
                            ? 'bg-green-100 border-green-300'
                            : req.hasSpoken
                              ? 'bg-gray-100 border-gray-200'
                              : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{req.subject}</span>
                          <div className="flex gap-1">
                            {req.isSpeaking && (
                              <Badge className="bg-green-600">Falando</Badge>
                            )}
                            {req.hasSpoken && !req.isSpeaking && (
                              <Badge variant="outline">Concluído</Badge>
                            )}
                            {!req.hasSpoken && !req.isSpeaking && (
                              <Badge variant="secondary">
                                {req.isApproved ? 'Aguardando' : 'Pendente'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============================================= */}
        {/* DIALOG DE CONFIRMAÇÃO DE VOTO */}
        {/* ============================================= */}
        <AlertDialog open={voteConfirmDialog.open} onOpenChange={(open) => setVoteConfirmDialog({ open, voteType: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Voto</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a votar <strong>{
                  voteConfirmDialog.voteType === 'YES' ? 'SIM' :
                  voteConfirmDialog.voteType === 'NO' ? 'NÃO' :
                  'ABSTENÇÃO'
                }</strong> na matéria em pauta.
                <br /><br />
                <strong>Atenção:</strong> Após confirmar, seu voto não poderá ser alterado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={votingInProgress}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => voteConfirmDialog.voteType && handleVote(voteConfirmDialog.voteType)}
                disabled={votingInProgress}
                className={`${
                  voteConfirmDialog.voteType === 'YES' ? 'bg-green-600 hover:bg-green-700' :
                  voteConfirmDialog.voteType === 'NO' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {votingInProgress ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Confirmar Voto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
