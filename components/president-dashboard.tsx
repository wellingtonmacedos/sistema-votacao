
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"
import { getPhaseLabel } from "@/lib/phase-utils"
import { 
  Calendar,
  FileText,
  Play,
  Square,
  Users,
  Vote,
  Clock,
  CheckCircle,
  ListTodo,
  AlertCircle
} from "lucide-react"

type CurrentVoting = {
  type: "matter" | "document"
  title: string
  isActive: boolean
}

type CurrentSessionData = {
  id: string
  title: string
  sessionNumber: string
  status: string
  currentPhase: string
  isSpeechRequestsOpen: boolean
  currentVoting: CurrentVoting | null
}

type SpeechRequestData = {
  id: string
  subject: string
  userId: string | null
  isApproved: boolean
  hasSpoken: boolean
  isSpeaking: boolean
}

type AttendanceData = {
  isAttendanceOpen: boolean
  quorum: number
  totalCount: number
  presentCount: number
  hasQuorum: boolean
  attendances?: Array<{
    isPresent: boolean
    user: {
      id: string
      role: string
    }
  }>
}

type MattersData = {
  session: {
    id: string
  } | null
  matters: Array<{
    id: string
    status: string
  }>
}

export function PresidentDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [presenceLoading, setPresenceLoading] = useState(false)
  const [currentSession, setCurrentSession] = useState<CurrentSessionData | null>(null)
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)
  const [pendingMattersCount, setPendingMattersCount] = useState(0)
  const [mySpeechRequests, setMySpeechRequests] = useState<SpeechRequestData[]>([])
  const [speechLoading, setSpeechLoading] = useState(false)

  const fetchDashboardData = async () => {
    try {
      const [sessionResponse, attendanceResponse, mattersResponse] = await Promise.all([
        fetch("/api/public/current-session"),
        fetch("/api/public/attendance"),
        fetch("/api/matters")
      ])

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json()
        setCurrentSession(sessionData)

        if (sessionData?.id) {
          const speechResponse = await fetch(
            `/api/speech-request?sessionId=${sessionData.id}&type=CONSIDERACOES_FINAIS`
          )
          if (speechResponse.ok) {
            const speechData: SpeechRequestData[] = await speechResponse.json()
            setMySpeechRequests(speechData.filter((req) => req.userId === session?.user?.id))
          }
        } else {
          setMySpeechRequests([])
        }
      }

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        setAttendance(attendanceData)
      }

      if (mattersResponse.ok) {
        const mattersData: MattersData = await mattersResponse.json()
        setPendingMattersCount(
          (mattersData.matters || []).filter((matter) =>
            matter.status === "PENDING" || matter.status === "VOTING"
          ).length
        )
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard da presidência:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleNewSession = () => {
    router.push('/president/nova-sessao')
  }

  const handleManageMatters = () => {
    router.push('/president/pautas')
  }

  const handleOpenVoting = () => {
    router.push('/votar')
  }

  const handleViewHistory = () => {
    router.push('/historico')
  }

  const handleViewScript = () => {
    router.push('/president/roteiro')
  }

  const handleMarkPresence = async () => {
    if (!currentSession?.id) return

    setPresenceLoading(true)
    try {
      const response = await fetch('/api/attendance/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSession.id })
      })

      if (response.ok) {
        toast.success('Presença do presidente registrada com sucesso!')
        await fetchDashboardData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao registrar presença do presidente')
      }
    } catch (error) {
      toast.error('Erro ao registrar presença do presidente')
    } finally {
      setPresenceLoading(false)
    }
  }

  const handleRequestSpeech = async () => {
    if (!currentSession?.id) return

    setSpeechLoading(true)
    try {
      const response = await fetch('/api/speech-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Considerações Finais',
          type: 'CONSIDERACOES_FINAIS',
          sessionId: currentSession.id
        })
      })

      if (response.ok) {
        toast.success('Solicitação de fala enviada!')
        await fetchDashboardData()
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

  const phaseLabel = getPhaseLabel(currentSession?.currentPhase || currentSession?.status)

  const presidentAttendance = attendance?.attendances?.find(
    (attendanceItem) => attendanceItem.user.id === session?.user?.id
  )
  const statusTitle = !currentSession
    ? "Aguardando sessão criada pelo Administrador"
    : attendance?.isAttendanceOpen && currentSession.currentVoting?.isActive
      ? "Sessão sincronizada com chamada e votação ativas"
      : currentSession.currentVoting?.isActive
        ? "Sessão sincronizada com votação em andamento"
        : attendance?.isAttendanceOpen
          ? "Sessão sincronizada com chamada aberta"
          : `Sessão ativa: ${currentSession.title}`

  const statusDescription = !currentSession
    ? "O Administrador controla criação de sessões, pautas e início das votações"
    : attendance?.isAttendanceOpen && currentSession.currentVoting?.isActive
      ? `A chamada está aberta e há votação em andamento: ${currentSession.currentVoting.title}`
      : currentSession.currentVoting?.isActive
      ? `Votação em andamento: ${currentSession.currentVoting.title}`
      : attendance?.isAttendanceOpen
        ? `A chamada está aberta nesta sessão. Fase atual: ${phaseLabel}`
        : `Fase atual da sessão: ${phaseLabel}`

  const needsPresence = Boolean(attendance?.isAttendanceOpen) && !presidentAttendance?.isPresent
  const needsSpeechRequest = Boolean(currentSession?.isSpeechRequestsOpen) && mySpeechRequests.length === 0
  const hasPriorityAction = needsPresence || needsSpeechRequest

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Presidência da Câmara
          </h1>
          <p className="text-gray-600">
            Presidir sessões e acompanhar os trabalhos legislativos
          </p>
        </div>

        {/* Ação prioritária */}
        {hasPriorityAction && (
          <div className={`sticky top-20 z-20 mb-6 border-2 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${needsPresence ? 'border-amber-400 bg-amber-50' : 'border-green-400 bg-green-50'}`}>
            <div>
              <p className={`text-sm font-semibold uppercase tracking-wide ${needsPresence ? 'text-amber-700' : 'text-green-700'}`}>
                Ação prioritária
              </p>
              <p className={`text-base font-semibold ${needsPresence ? 'text-amber-900' : 'text-green-900'}`}>
                {needsPresence
                  ? 'A chamada de presença está aberta.'
                  : 'As inscrições para Considerações Finais estão abertas.'}
              </p>
              <p className={`text-sm ${needsPresence ? 'text-amber-800' : 'text-green-800'}`}>
                {needsPresence
                  ? 'Registre sua presença como presidente da sessão.'
                  : 'Solicite sua fala nas considerações finais.'}
              </p>
            </div>
            <Button
              size="lg"
              onClick={needsPresence ? handleMarkPresence : handleRequestSpeech}
              disabled={needsPresence ? presenceLoading : speechLoading}
              className={`text-white ${needsPresence ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {needsPresence
                ? (presenceLoading ? 'Registrando...' : 'Registrar Minha Presença')
                : (speechLoading ? 'Enviando...' : 'Solicitar Fala')}
            </Button>
          </div>
        )}

        {/* Session Status */}
        <div className={`${currentSession ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} border rounded-lg p-4 mb-8`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentSession ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-amber-600" />
              )}
              <div>
                <h3 className={`font-semibold ${currentSession ? 'text-green-900' : 'text-amber-900'}`}>
                  {loading ? 'Carregando sessão...' : statusTitle}
                </h3>
                <p className={`text-sm ${currentSession ? 'text-green-700' : 'text-amber-700'}`}>
                  {loading ? 'Buscando informações da sessão atual...' : statusDescription}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white">
              {currentSession ? phaseLabel : 'Aguardando'}
            </Badge>
          </div>
          {currentSession && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className={attendance?.isAttendanceOpen ? 'bg-blue-600' : 'bg-gray-500'}>
                {attendance?.isAttendanceOpen ? 'Chamada Aberta' : 'Chamada Fechada'}
              </Badge>
              <Badge className={currentSession.currentVoting?.isActive ? 'bg-purple-600' : 'bg-gray-500'}>
                {currentSession.currentVoting?.isActive ? 'Votação em Andamento' : 'Sem Votação Ativa'}
              </Badge>
              {attendance && (
                <Badge variant="outline" className="bg-white">
                  Presenças: {attendance.presentCount}/{attendance.totalCount}
                </Badge>
              )}
              {attendance?.isAttendanceOpen && (
                presidentAttendance?.isPresent ? (
                  <Badge className="bg-emerald-600">
                    Presença do Presidente Registrada
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleMarkPresence}
                    disabled={presenceLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {presenceLoading ? 'Registrando Presença...' : 'Registrar Minha Presença'}
                  </Button>
                )
              )}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Vereadores Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendance?.totalCount ?? 0}</div>
              <p className="text-xs text-gray-600">
                Parlamentares ativos na sessão
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sessões Este Mês
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentSession ? 1 : 0}</div>
              <p className="text-xs text-gray-600">
                {currentSession?.sessionNumber || 'Nenhuma sessão ativa'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pautas Pendentes
              </CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingMattersCount}</div>
              <p className="text-xs text-gray-600">
                {pendingMattersCount > 0 ? 'Matérias pendentes ou em votação' : 'Nenhuma pauta pendente'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Quórum Mínimo
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendance?.quorum ?? 7}</div>
              <p className="text-xs text-gray-600">
                {attendance ? `${attendance.presentCount} presentes neste momento` : 'Maioria simples da sessão'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className={`hover:shadow-md transition-shadow cursor-pointer ${currentSession ? '' : 'opacity-70'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Play className={`h-5 w-5 ${currentSession ? 'text-green-600' : 'text-gray-400'}`} />
                  Presidir Sessão
                </CardTitle>
                <Badge variant={currentSession ? 'default' : 'secondary'}>
                  {currentSession ? phaseLabel : 'Aguardando'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                {currentSession
                  ? `Sessão sincronizada${attendance?.isAttendanceOpen ? ' com chamada aberta' : ''}${currentSession.currentVoting?.isActive ? ' e votação em andamento' : ''}.`
                  : 'Presidir sessão ativa quando criada pelo Administrador'}
              </p>
              <Button
                className="w-full"
                variant={currentSession ? 'default' : 'secondary'}
                disabled={!currentSession}
                onClick={currentSession?.currentVoting?.isActive ? handleOpenVoting : handleManageMatters}
              >
                {currentSession
                  ? currentSession.currentVoting?.isActive
                    ? 'Abrir Votação'
                    : 'Acompanhar Sessão'
                  : 'Nenhuma Sessão Ativa'}
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Visualizar Pautas
                </CardTitle>
                <Badge variant="secondary">{pendingMattersCount} pauta{pendingMattersCount === 1 ? '' : 's'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Consultar pautas cadastradas pelo Administrador
              </p>
              <Button variant="outline" className="w-full" onClick={handleManageMatters}>
                Ver Pautas
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-emerald-600" />
                  Roteiro
                </CardTitle>
                <Badge variant="secondary">Sessão</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Seguir o roteiro cadastrado pelo administrador, marcando os itens realizados e registrando notas.
              </p>
              <Button variant="outline" className="w-full" onClick={handleViewScript}>
                Abrir Roteiro
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Vote className="h-5 w-5 text-purple-600" />
                  Histórico
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Consultar sessões anteriores e resultados das votações
              </p>
              <Button variant="outline" className="w-full" onClick={handleViewHistory}>
                Ver Histórico
              </Button>
            </CardContent>
          </Card>
        </div>

        {currentSession?.currentVoting?.isActive && (
          <Card className="mt-8 border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <AlertCircle className="h-5 w-5 text-purple-600" />
                Votação Sincronizada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-purple-800">
                Há uma votação em andamento no sistema: <strong>{currentSession.currentVoting.title}</strong>.
              </p>
            </CardContent>
          </Card>
        )}

        {currentSession && (
          <Card className={`mt-8 ${needsSpeechRequest ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Considerações Finais
                {needsSpeechRequest && (
                  <Badge className="bg-green-600 text-white">INSCRIÇÕES ABERTAS</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!currentSession.isSpeechRequestsOpen ? (
                <p className="text-sm text-gray-600">
                  As inscrições para Considerações Finais ainda não foram abertas.
                </p>
              ) : mySpeechRequests.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Sua solicitação de fala:</p>
                  {mySpeechRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
                      <span className="font-medium text-gray-900">{req.subject}</span>
                      {req.isSpeaking ? (
                        <Badge className="bg-green-600">Falando</Badge>
                      ) : req.hasSpoken ? (
                        <Badge variant="outline">Concluído</Badge>
                      ) : (
                        <Badge variant="secondary">Aguardando</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    As inscrições estão abertas. O presidente também pode participar das considerações finais.
                  </p>
                  <Button
                    onClick={handleRequestSpeech}
                    disabled={speechLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {speechLoading ? 'Enviando...' : 'Solicitar Fala'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
