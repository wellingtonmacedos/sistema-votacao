
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Clock, Users, FileText, Vote, User, BookOpen, Mic, CheckCircle } from "lucide-react"

interface SessionData {
  id: string
  sessionNumber: string
  date: string
  status: string
  currentVoting?: {
    type: 'matter' | 'document'
    id: string
    title: string
    description: string
    documentType?: string
    author?: string
    votes: {
      yes: number
      no: number
      abstention: number
    }
    totalVoters: number
    isActive: boolean
  }
  timer?: {
    isActive: boolean
    timeRemaining: number
    phase: string
  }
}

interface CurrentSpeakerData {
  id: string
  subject: string
  user: {
    id: string
    fullName: string
  }
  legislativeProcesses: Array<{
    id: string
    number: string
    title: string
    description: string
    type: string
    status: string
  }>
}

interface AttendanceData {
  sessionId: string
  isAttendanceOpen: boolean
  attendanceStartedAt: string | null
  attendanceEndedAt: string | null
  quorum: number
  attendances: Array<{
    id: string
    isPresent: boolean
    arrivedAt: string | null
    user: {
      id: string
      fullName: string
      role: string
      photoUrl: string | null
      party: string | null
      partyLogoUrl: string | null
    }
  }>
  presentCount: number
  totalCount: number
  hasQuorum: boolean
}

interface SpeechRequestData {
  id: string
  name: string
  party: string
  profession: string | null
  subject: string
  isSpeaking: boolean
  hasSpoken: boolean
  timeLimit: number | null
  startedAt: string | null
  endedAt: string | null
  orderIndex: number
}

export function PublicDisplayPanel() {
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [currentSpeaker, setCurrentSpeaker] = useState<CurrentSpeakerData | null>(null)
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [scrollPosition, setScrollPosition] = useState(0)
  const [votingVotes, setVotingVotes] = useState<any[]>([])
  const [votingResult, setVotingResult] = useState<any>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date())
  const [isUpdating, setIsUpdating] = useState(false)
  const [readingDocument, setReadingDocument] = useState<any>(null)
  const [speechRequests, setSpeechRequests] = useState<SpeechRequestData[]>([])
  const [consideracoesFinais, setConsideracoesFinais] = useState<SpeechRequestData[]>([])
  const [tribunaLivre, setTribunaLivre] = useState<SpeechRequestData[]>([])
  const [isSpeechRequestsOpen, setIsSpeechRequestsOpen] = useState(false)

  // Atualizar horário
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Buscar dados da sessão
  useEffect(() => {
    const fetchSessionData = async () => {
      setIsUpdating(true)
      try {
        // Buscar dados da sessão primeiro
        const response = await fetch('/api/public/current-session')
        if (response.ok) {
          const data = await response.json()
          setSessionData(data)

          // Se há votação ativa, buscar votos individuais imediatamente
          if (data && data.currentVoting && data.currentVoting.isActive) {
            const votesResponse = await fetch(
              `/api/vote?type=${data.currentVoting.type}&itemId=${data.currentVoting.id}`
            )
            if (votesResponse.ok) {
              const votesData = await votesResponse.json()
              setVotingVotes(votesData.votes || [])
            }
          } else {
            setVotingVotes([])
          }
        }

        // Buscar demais dados em paralelo para otimizar
        const [speakerResponse, attendanceResponse, resultResponse, documentResponse, speechRequestsResponse] = await Promise.all([
          fetch('/api/public/current-speaking'),
          fetch('/api/public/attendance'),
          fetch('/api/admin/show-result'),
          fetch('/api/public/reading-document'),
          fetch('/api/public/speech-requests')
        ])

        // Processar resposta do speaker
        if (speakerResponse.ok) {
          const speakerData = await speakerResponse.json()
          setCurrentSpeaker(speakerData)
        } else {
          setCurrentSpeaker(null)
        }

        // Processar resposta da presença
        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json()
          setAttendanceData(attendanceData)
        } else {
          setAttendanceData(null)
        }

        // Processar resposta do resultado
        if (resultResponse.ok) {
          const resultData = await resultResponse.json()
          setVotingResult(resultData.result)
        }

        // Processar resposta do documento sendo lido
        if (documentResponse.ok) {
          const documentData = await documentResponse.json()
          // Garantir que null seja tratado corretamente
          if (documentData.document) {
            setReadingDocument(documentData.document)
          } else {
            setReadingDocument(null)
          }
        } else {
          setReadingDocument(null)
        }

        // Processar resposta das inscrições de fala
        if (speechRequestsResponse.ok) {
          const speechRequestsData = await speechRequestsResponse.json()
          setSpeechRequests(speechRequestsData.speechRequests || [])
          setConsideracoesFinais(speechRequestsData.consideracoesFinais || [])
          setTribunaLivre(speechRequestsData.tribunaLivre || [])
          setIsSpeechRequestsOpen(speechRequestsData.isSpeechRequestsOpen || false)
        } else {
          setSpeechRequests([])
          setConsideracoesFinais([])
          setTribunaLivre([])
          setIsSpeechRequestsOpen(false)
        }
        
        // Atualizar timestamp da última atualização
        setLastUpdateTime(new Date())
      } catch (error) {
        console.error('Erro ao buscar dados da sessão:', error)
      } finally {
        setIsUpdating(false)
      }
    }

    // Fazer a primeira busca imediatamente
    fetchSessionData()
    
    // Sistema de polling fixo para garantir atualizações consistentes
    const intervalId = setInterval(fetchSessionData, 2000) // atualiza a cada 2 segundos
    
    return () => {
      clearInterval(intervalId)
    }
  }, [])

  // Auto scroll para documentos - resetar posição quando documento muda
  useEffect(() => {
    if (!readingDocument) {
      setScrollPosition(0)
      return
    }

    // Resetar scroll quando novo documento é exibido
    setScrollPosition(0)

    const interval = setInterval(() => {
      setScrollPosition(prev => prev + 0.5) // Scroll mais suave
    }, 50)

    return () => clearInterval(interval)
  }, [readingDocument?.id])

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      PEQUENO_EXPEDIENTE: { label: "PEQUENO EXPEDIENTE", color: "bg-blue-500" },
      GRANDE_EXPEDIENTE: { label: "GRANDE EXPEDIENTE", color: "bg-green-500" },
      ORDEM_DO_DIA: { label: "ORDEM DO DIA", color: "bg-red-500" },
      CONSIDERACOES_FINAIS: { label: "CONSIDERAÇÕES FINAIS", color: "bg-purple-500" },
      TRIBUNA_LIVE: { label: "TRIBUNA LIVRE", color: "bg-yellow-500" },
      CLOSED: { label: "SESSÃO ENCERRADA", color: "bg-gray-500" }
    }
    return statusMap[status] || { label: status, color: "bg-gray-500" }
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-8"></div>
          <h2 className="text-3xl font-bold mb-4">Carregando Painel Público</h2>
          <p className="text-xl opacity-80">Aguardando dados da sessão...</p>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusDisplay(sessionData.status)

  // Se não houver sessão ativa
  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-24 w-24 mx-auto mb-6 text-white/50 animate-pulse" />
          <h1 className="text-4xl font-bold mb-4">CÂMARA DE VEREADORES</h1>
          <p className="text-2xl text-white/80 mb-2">Nenhuma sessão ativa no momento</p>
          <p className="text-lg text-white/60">Aguarde o início da próxima sessão</p>
          <div className="mt-8 text-5xl font-mono font-bold text-white/40">
            {currentTime.toLocaleTimeString('pt-BR')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm p-6 border-b border-white/20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              CÂMARA DE VEREADORES
            </h1>
            <p className="text-xl opacity-90">
              Sessão Nº {sessionData.sessionNumber} - {new Date(sessionData.date).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono font-bold mb-2">
              {currentTime.toLocaleTimeString('pt-BR')}
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`text-lg px-4 py-2 ${statusInfo.color} text-white border-0`}>
                {statusInfo.label}
              </Badge>
              
              {/* Indicador de atualização em tempo real */}
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isUpdating ? 'bg-green-400 animate-pulse' : 'bg-green-500'
                }`}></div>
                <span className="text-xs text-white/80 font-medium">
                  {isUpdating ? 'ATUALIZANDO' : 'AO VIVO'}
                </span>
              </div>
            </div>
            
            {/* Timestamp da última atualização */}
            <div className="mt-1 text-xs text-white/60">
              Última atualização: {lastUpdateTime.toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
        {/* Lista de Presença - Quando a chamada estiver aberta */}
        {attendanceData && attendanceData.isAttendanceOpen && (
          <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-3 h-full">
              {/* Header compacto */}
              <div className="relative mb-3">
                <div className="flex items-center justify-between gap-4">
                  {/* Título */}
                  <div className="flex items-center">
                    <Users className="h-6 w-6 mr-2 text-emerald-400" />
                    <h3 className="text-xl font-bold text-white">CHAMADA DE PRESENÇA</h3>
                  </div>
                  
                  {/* Status do quórum compacto */}
                  <div className="flex items-center gap-3">
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full font-bold text-sm text-white shadow-lg ${
                      attendanceData.hasQuorum 
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
                        : 'bg-gradient-to-r from-red-500 to-rose-600'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        attendanceData.hasQuorum ? 'bg-white animate-pulse' : 'bg-white/80'
                      }`}></div>
                      {attendanceData.hasQuorum ? '✅ QUÓRUM' : '⏳ AGUARDANDO'}
                    </div>
                    
                    {/* Contador */}
                    <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                      <span className="text-lg font-bold text-white">{attendanceData.presentCount}</span>
                      <span className="text-sm text-white/70"> / {attendanceData.totalCount}</span>
                    </div>
                  </div>
                </div>
                
                {/* Barra de progresso compacta */}
                <div className="mt-2">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        attendanceData.hasQuorum 
                          ? 'bg-gradient-to-r from-emerald-400 to-green-500' 
                          : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                      }`}
                      style={{
                        width: `${Math.min((attendanceData.presentCount / attendanceData.quorum) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Grid de vereadores - layout compacto para caber na tela */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 p-1">
                {attendanceData.attendances.map((attendance, index) => (
                  <div 
                    key={attendance.id}
                    className={`group relative overflow-hidden rounded-lg transition-all duration-300 ${
                      attendance.isPresent 
                        ? 'bg-gradient-to-br from-emerald-500/40 to-green-600/30 border border-emerald-400/50' 
                        : 'bg-gradient-to-br from-slate-600/30 to-gray-700/20 border border-gray-500/30'
                    } shadow-lg backdrop-blur-sm`}
                  >
                    {/* Status indicator no topo */}
                    <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                      attendance.isPresent 
                        ? 'bg-gradient-to-r from-emerald-400 to-green-500' 
                        : 'bg-gradient-to-r from-gray-400 to-slate-500'
                    }`}></div>

                    <div className="relative p-2 text-center">
                      {/* Avatar/Foto compacto */}
                      <div className="relative mb-1">
                        {attendance.user.photoUrl ? (
                          <img 
                            src={attendance.user.photoUrl}
                            alt={attendance.user.fullName}
                            className={`w-10 h-10 mx-auto rounded-full object-cover shadow-md ${
                              attendance.isPresent 
                                ? 'ring-2 ring-emerald-400/60' 
                                : 'ring-2 ring-gray-400/40 grayscale opacity-70'
                            }`}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 mx-auto rounded-full items-center justify-center text-white font-bold text-sm shadow-md ${
                          attendance.isPresent 
                            ? 'bg-gradient-to-br from-emerald-500 to-green-600 ring-2 ring-emerald-400/40' 
                            : 'bg-gradient-to-br from-gray-500 to-slate-600 ring-2 ring-gray-400/30'
                        } ${attendance.user.photoUrl ? 'hidden' : 'flex'}`}>
                          {attendance.user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        
                        {/* Status badge no avatar */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow ${
                          attendance.isPresent ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {attendance.isPresent ? '✓' : '×'}
                        </div>
                      </div>
                      
                      {/* Nome do vereador - compacto */}
                      <h4 className="font-semibold text-white text-[10px] leading-tight truncate px-0.5">
                        {attendance.user.fullName.split(' ').slice(0, 2).join(' ').toUpperCase()}
                      </h4>

                      {/* Partido */}
                      {attendance.user.party && (
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          {attendance.user.partyLogoUrl && (
                            <img 
                              src={attendance.user.partyLogoUrl} 
                              alt={attendance.user.party}
                              className="w-3 h-3 object-contain"
                              onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                          )}
                          <span className="text-[8px] text-white/70 font-medium">{attendance.user.party}</span>
                        </div>
                      )}
                      
                      {/* Status badge compacto */}
                      <div className="mt-1">
                        {attendance.isPresent ? (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-[8px] shadow">
                            <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></div>
                            PRESENTE
                          </div>
                        ) : (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-gradient-to-r from-gray-500 to-slate-600 text-white font-bold text-[8px] shadow">
                            AUSENTE
                          </div>
                        )}
                      </div>

                      {/* Horário de chegada - compacto */}
                      {attendance.isPresent && attendance.arrivedAt && (
                        <div className="text-[8px] text-emerald-300 font-medium mt-0.5">
                          {new Date(attendance.arrivedAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tela de Votação - Similar à de Presença */}
        {sessionData.currentVoting && sessionData.currentVoting.isActive && attendanceData && !attendanceData.isAttendanceOpen && (
          <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 h-full">
              <div className="relative mb-8">
                <div className="flex items-center justify-between">
                  {/* Título principal com gradiente */}
                  <div className="flex items-center">
                    <div className="relative">
                      <Vote className="h-10 w-10 mr-4 text-red-400 drop-shadow-lg" />
                      <div className="absolute inset-0 h-10 w-10 mr-4 text-red-400/30 animate-ping"></div>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-red-200 mb-1 tracking-wide">
                        VOTAÇÃO EM ANDAMENTO
                      </h3>
                      <p className="text-lg text-red-100/90 font-medium">
                        {sessionData.currentVoting.title}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {sessionData.currentVoting.type === 'document' && sessionData.currentVoting.documentType && (
                          <Badge variant="outline" className="text-xs border-white/30 text-white/70">
                            {sessionData.currentVoting.documentType}
                          </Badge>
                        )}
                        {sessionData.currentVoting.type === 'matter' && (
                          <Badge variant="outline" className="text-xs border-white/30 text-white/70">
                            MATÉRIA
                          </Badge>
                        )}
                        {sessionData.currentVoting.author && (
                          <span className="text-xs text-white/60">
                            Autor: {sessionData.currentVoting.author}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Estatísticas da votação */}
                  <div className="text-right">
                    <div className="space-y-2">
                      <div className="flex gap-4 justify-end">
                        <div className="text-center bg-green-500/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-green-400/30">
                          <div className="text-2xl font-bold text-green-400">
                            {sessionData.currentVoting.votes.yes}
                          </div>
                          <div className="text-xs text-green-300 uppercase tracking-wide">
                            Favorável
                          </div>
                        </div>
                        <div className="text-center bg-red-500/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-red-400/30">
                          <div className="text-2xl font-bold text-red-400">
                            {sessionData.currentVoting.votes.no}
                          </div>
                          <div className="text-xs text-red-300 uppercase tracking-wide">
                            Contrário
                          </div>
                        </div>
                        <div className="text-center bg-yellow-500/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-yellow-400/30">
                          <div className="text-2xl font-bold text-yellow-400">
                            {sessionData.currentVoting.votes.abstention}
                          </div>
                          <div className="text-xs text-yellow-300 uppercase tracking-wide">
                            Abstenção
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-white/80 font-medium bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                          📊 {sessionData.currentVoting.votes.yes + sessionData.currentVoting.votes.no + sessionData.currentVoting.votes.abstention} / {sessionData.currentVoting.totalVoters} votaram
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-[calc(100%-200px)]">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-2">
                  {attendanceData.attendances
                    .filter(attendance => attendance.isPresent)
                    .map((attendance, index) => {
                      // Buscar o voto deste vereador
                      const userVote = votingVotes.find(vote => vote.user.id === attendance.user.id)
                      let voteColor = 'from-slate-600/20 via-gray-500/15 to-slate-500/10 border-gray-400/30'
                      let voteText = 'NÃO VOTOU'
                      let voteBadgeColor = 'bg-gray-500'
                      let voteIcon = '⏳'

                      if (userVote) {
                        if (userVote.voteType === 'YES') {
                          voteColor = 'from-emerald-500/30 via-green-500/25 to-teal-500/20 border-emerald-400/40'
                          voteText = 'FAVORÁVEL'
                          voteBadgeColor = 'bg-green-500'
                          voteIcon = '✓'
                        } else if (userVote.voteType === 'NO') {
                          voteColor = 'from-red-500/30 via-rose-500/25 to-red-500/20 border-red-400/40'
                          voteText = 'CONTRÁRIO'
                          voteBadgeColor = 'bg-red-500'
                          voteIcon = '✗'
                        } else if (userVote.voteType === 'ABSTENTION') {
                          voteColor = 'from-yellow-500/30 via-amber-500/25 to-orange-500/20 border-yellow-400/40'
                          voteText = 'ABSTENÇÃO'
                          voteBadgeColor = 'bg-yellow-500'
                          voteIcon = '○'
                        }
                      }

                      return (
                        <div 
                          key={attendance.id}
                          className={`group relative overflow-hidden rounded-xl transition-all duration-700 ease-out transform hover:scale-105 hover:-translate-y-1 bg-gradient-to-br ${voteColor} shadow-xl backdrop-blur-sm hover:shadow-2xl`}
                          style={{
                            animationDelay: `${index * 50}ms`
                          }}
                        >
                          {/* Efeito de brilho no hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                          
                          {/* Status indicator no topo */}
                          <div className={`absolute top-0 left-0 right-0 h-1 ${
                            userVote 
                              ? userVote.voteType === 'YES' ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                                userVote.voteType === 'NO' ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                                'bg-gradient-to-r from-yellow-400 to-amber-500'
                              : 'bg-gradient-to-r from-gray-400 to-slate-500'
                          }`}></div>

                          <div className="relative p-5 text-center">
                            {/* Avatar com gradiente e sombra */}
                            <div className="relative mb-4">
                              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg transition-all duration-300 group-hover:shadow-xl ${
                                userVote
                                  ? userVote.voteType === 'YES' ? 'bg-gradient-to-br from-emerald-500 to-green-600 ring-4 ring-emerald-400/30' :
                                    userVote.voteType === 'NO' ? 'bg-gradient-to-br from-red-500 to-rose-600 ring-4 ring-red-400/30' :
                                    'bg-gradient-to-br from-yellow-500 to-amber-600 ring-4 ring-yellow-400/30'
                                  : 'bg-gradient-to-br from-gray-500 to-slate-600 ring-4 ring-gray-400/20'
                              }`}>
                                <span className="drop-shadow-sm">
                                  {attendance.user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </span>
                              </div>
                              
                              {/* Pulse animation para quem já votou */}
                              {userVote && (
                                <div className={`absolute inset-0 rounded-full animate-ping ${
                                  userVote.voteType === 'YES' ? 'bg-emerald-400/30' :
                                  userVote.voteType === 'NO' ? 'bg-red-400/30' :
                                  'bg-yellow-400/30'
                                }`}></div>
                              )}
                              
                              {/* Status badge no avatar */}
                              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ${voteBadgeColor}`}>
                                {voteIcon}
                              </div>
                            </div>
                            
                            {/* Nome do vereador */}
                            <h4 className="font-bold text-white text-sm mb-2 leading-tight tracking-wide">
                              {attendance.user.fullName.toUpperCase()}
                            </h4>
                            
                            {/* Status do voto */}
                            <div className="mb-3">
                              <div className={`inline-flex items-center px-4 py-2 rounded-full text-white font-bold text-xs shadow-lg ${
                                userVote
                                  ? userVote.voteType === 'YES' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                                    userVote.voteType === 'NO' ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                                    'bg-gradient-to-r from-yellow-500 to-amber-600'
                                  : 'bg-gradient-to-r from-gray-500 to-slate-600'
                              }`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                  userVote ? 'bg-white animate-pulse' : 'bg-gray-300'
                                }`}></div>
                                {voteText}
                              </div>
                            </div>

                            {/* Horário do voto */}
                            {userVote && (
                              <div className={`text-xs font-medium rounded-lg px-2 py-1 backdrop-blur-sm ${
                                userVote.voteType === 'YES' ? 'text-emerald-300 bg-emerald-900/30' :
                                userVote.voteType === 'NO' ? 'text-red-300 bg-red-900/30' :
                                'text-yellow-300 bg-yellow-900/30'
                              }`}>
                                🗳️ {new Date(userVote.votedAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </div>

                          {/* Decorative elements */}
                          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full opacity-60 ${
                            userVote 
                              ? userVote.voteType === 'YES' ? 'bg-emerald-400' :
                                userVote.voteType === 'NO' ? 'bg-red-400' :
                                'bg-yellow-400'
                              : 'bg-gray-400'
                          }`}></div>
                          <div className={`absolute bottom-2 left-2 w-1 h-1 rounded-full opacity-40 ${
                            userVote 
                              ? userVote.voteType === 'YES' ? 'bg-green-400' :
                                userVote.voteType === 'NO' ? 'bg-rose-400' :
                                'bg-amber-400'
                              : 'bg-gray-400'
                          }`}></div>
                        </div>
                      )
                    })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Inscrições para Fala - Considerações Finais */}
        {/* Oculta esta seção se houver pronunciamento ativo na Tribuna Livre */}
        {/* Mostra apenas quem está falando agora */}
        {consideracoesFinais.filter(r => r.isSpeaking).length > 0 && !attendanceData?.isAttendanceOpen && !(sessionData.currentVoting && sessionData.currentVoting.isActive) && !tribunaLivre.some(r => r.isSpeaking) && (
          <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 h-full">
              <div className="relative mb-8">
                <div className="flex items-center justify-between">
                  {/* Título principal com gradiente */}
                  <div className="flex items-center">
                    <div className="relative">
                      <Mic className="h-10 w-10 mr-4 text-purple-400 drop-shadow-lg" />
                      <div className="absolute inset-0 h-10 w-10 mr-4 text-purple-400/30 animate-ping"></div>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 mb-1 tracking-wide">
                        CONSIDERAÇÕES FINAIS
                      </h3>
                      <p className="text-lg text-purple-100/90 font-medium">
                        {isSpeechRequestsOpen ? 'Inscrições abertas' : 'Lista de inscritos'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status das inscrições */}
                  <div className="text-right">
                    <div className={`inline-flex items-center px-6 py-3 rounded-2xl font-bold text-lg text-white shadow-2xl backdrop-blur-sm border-2 ${
                      isSpeechRequestsOpen 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-300/40 shadow-green-500/30' 
                        : 'bg-gradient-to-r from-purple-500 to-indigo-600 border-purple-300/40 shadow-purple-500/30'
                    }`}>
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        isSpeechRequestsOpen ? 'bg-white animate-pulse' : 'bg-white/80'
                      }`}></div>
                      {isSpeechRequestsOpen ? '📝 INSCRIÇÕES ABERTAS' : '📋 LISTA DE INSCRITOS'}
                    </div>
                    
                    {/* Total de inscritos */}
                    <div className="mt-3">
                      <div className="text-right bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                        <div className="text-2xl font-bold text-white">
                          {consideracoesFinais.filter(r => r.isSpeaking).length}
                        </div>
                        <div className="text-xs text-white/80 uppercase tracking-wide">
                          FALANDO AGORA
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-[calc(100%-200px)]">
                <div className="space-y-4 p-2">
                  {consideracoesFinais.filter(r => r.isSpeaking).map((request, index) => {
                    // Determinar cores baseado no status
                    let cardColor = 'from-slate-600/20 via-gray-500/15 to-slate-500/10 border-gray-400/30'
                    let statusText = 'AGUARDANDO'
                    let statusColor = 'bg-gray-500'
                    let statusIcon = '⏳'
                    
                    if (request.isSpeaking) {
                      cardColor = 'from-green-500/30 via-emerald-500/25 to-teal-500/20 border-emerald-400/40'
                      statusText = 'FALANDO AGORA'
                      statusColor = 'bg-green-500'
                      statusIcon = '🎤'
                    } else if (request.hasSpoken) {
                      cardColor = 'from-blue-500/20 via-indigo-500/15 to-blue-500/10 border-blue-400/30'
                      statusText = 'JÁ FALOU'
                      statusColor = 'bg-blue-500'
                      statusIcon = '✓'
                    }

                    // Calcular tempo decorrido se estiver falando
                    let timeElapsed = 0
                    let timeRemaining = 0
                    if (request.isSpeaking && request.startedAt && request.timeLimit) {
                      const startTime = new Date(request.startedAt).getTime()
                      const now = new Date().getTime()
                      timeElapsed = Math.floor((now - startTime) / 1000) // em segundos
                      const totalSeconds = request.timeLimit * 60
                      timeRemaining = Math.max(0, totalSeconds - timeElapsed)
                    }

                    return (
                      <div 
                        key={request.id}
                        className={`group relative overflow-hidden rounded-xl transition-all duration-700 ease-out bg-gradient-to-br ${cardColor} shadow-xl backdrop-blur-sm p-6`}
                        style={{
                          animationDelay: `${index * 50}ms`
                        }}
                      >
                        {/* Efeito de brilho */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                        
                        {/* Barra de status no topo */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${
                          request.isSpeaking ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                          request.hasSpoken ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                          'bg-gradient-to-r from-gray-400 to-slate-500'
                        }`}></div>

                        <div className="relative flex items-center justify-between">
                          {/* Informações do inscrito */}
                          <div className="flex items-center gap-4 flex-1">
                            {/* Número da ordem */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-lg ${
                              request.isSpeaking ? 'bg-gradient-to-br from-emerald-500 to-green-600 ring-4 ring-emerald-400/30' :
                              request.hasSpoken ? 'bg-gradient-to-br from-blue-500 to-indigo-600 ring-4 ring-blue-400/30' :
                              'bg-gradient-to-br from-gray-500 to-slate-600 ring-4 ring-gray-400/20'
                            } text-white`}>
                              {index + 1}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="text-xl font-bold text-white">{request.name}</h4>
                                <Badge variant="outline" className="text-xs border-white/30 text-white/70">
                                  {request.party}
                                </Badge>
                              </div>
                              <p className="text-white/70 text-sm line-clamp-2">{request.subject}</p>
                            </div>
                          </div>

                          {/* Status e timer */}
                          <div className="text-right ml-4">
                            <Badge className={`${statusColor} text-white px-4 py-2 mb-2`}>
                              {statusIcon} {statusText}
                            </Badge>
                            
                            {/* Timer quando está falando */}
                            {request.isSpeaking && request.timeLimit && (
                              <div className="mt-2">
                                <div className="text-2xl font-mono font-bold text-white">
                                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                                </div>
                                <div className="text-xs text-white/60">
                                  Limite: {request.timeLimit} min
                                </div>
                                {/* Barra de progresso do tempo */}
                                <div className="mt-2 w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                      timeRemaining < 60 ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                                      timeRemaining < 120 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                      'bg-gradient-to-r from-green-400 to-emerald-500'
                                    }`}
                                    style={{
                                      width: `${Math.max(0, (timeRemaining / (request.timeLimit * 60)) * 100)}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Inscrições para Fala - Tribuna Livre */}
        {/* Mostra apenas quem está falando agora */}
        {tribunaLivre.filter(r => r.isSpeaking).length > 0 && !attendanceData?.isAttendanceOpen && !(sessionData.currentVoting && sessionData.currentVoting.isActive) && (
          <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 h-full">
              <div className="relative mb-8">
                <div className="flex items-center justify-between">
                  {/* Título principal com gradiente */}
                  <div className="flex items-center">
                    <div className="relative">
                      <Mic className="h-10 w-10 mr-4 text-yellow-400 drop-shadow-lg" />
                      <div className="absolute inset-0 h-10 w-10 mr-4 text-yellow-400/30 animate-ping"></div>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-yellow-200 mb-1 tracking-wide">
                        TRIBUNA LIVRE
                      </h3>
                      <p className="text-lg text-yellow-100/90 font-medium">
                        {isSpeechRequestsOpen ? 'Manifestações abertas' : 'Lista de manifestações'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status das inscrições */}
                  <div className="text-right">
                    <div className={`inline-flex items-center px-6 py-3 rounded-2xl font-bold text-lg text-white shadow-2xl backdrop-blur-sm border-2 ${
                      isSpeechRequestsOpen 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-300/40 shadow-green-500/30' 
                        : 'bg-gradient-to-r from-yellow-500 to-amber-600 border-yellow-300/40 shadow-yellow-500/30'
                    }`}>
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        isSpeechRequestsOpen ? 'bg-white animate-pulse' : 'bg-white/80'
                      }`}></div>
                      {isSpeechRequestsOpen ? '📝 ABERTAS' : '📋 LISTA'}
                    </div>
                    
                    {/* Total de inscritos */}
                    <div className="mt-3">
                      <div className="text-right bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                        <div className="text-2xl font-bold text-white">
                          {tribunaLivre.filter(r => r.isSpeaking).length}
                        </div>
                        <div className="text-xs text-white/80 uppercase tracking-wide">
                          FALANDO AGORA
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-[calc(100%-200px)]">
                <div className="space-y-4 p-2">
                  {tribunaLivre.filter(r => r.isSpeaking).map((request, index) => {
                    // Determinar cores baseado no status (amarelo/dourado para Tribuna Livre)
                    let cardColor = 'from-slate-600/20 via-gray-500/15 to-slate-500/10 border-gray-400/30'
                    let statusText = 'AGUARDANDO'
                    let statusColor = 'bg-gray-500'
                    let statusIcon = '⏳'
                    
                    if (request.isSpeaking) {
                      cardColor = 'from-yellow-500/30 via-amber-500/25 to-yellow-500/20 border-yellow-400/40'
                      statusText = 'FALANDO AGORA'
                      statusColor = 'bg-yellow-500'
                      statusIcon = '🎤'
                    } else if (request.hasSpoken) {
                      cardColor = 'from-orange-500/20 via-amber-500/15 to-orange-500/10 border-orange-400/30'
                      statusText = 'JÁ FALOU'
                      statusColor = 'bg-orange-500'
                      statusIcon = '✓'
                    }

                    // Calcular tempo decorrido se estiver falando
                    let timeElapsed = 0
                    let timeRemaining = 0
                    if (request.isSpeaking && request.startedAt && request.timeLimit) {
                      const startTime = new Date(request.startedAt).getTime()
                      const now = new Date().getTime()
                      timeElapsed = Math.floor((now - startTime) / 1000) // em segundos
                      const totalSeconds = request.timeLimit * 60
                      timeRemaining = Math.max(0, totalSeconds - timeElapsed)
                    }

                    return (
                      <div 
                        key={request.id}
                        className={`group relative overflow-hidden rounded-xl transition-all duration-700 ease-out bg-gradient-to-br ${cardColor} shadow-xl backdrop-blur-sm p-6`}
                        style={{
                          animationDelay: `${index * 50}ms`
                        }}
                      >
                        {/* Efeito de brilho */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                        
                        {/* Barra de status no topo */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${
                          request.isSpeaking ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                          request.hasSpoken ? 'bg-gradient-to-r from-orange-400 to-amber-500' :
                          'bg-gradient-to-r from-gray-400 to-slate-500'
                        }`}></div>

                        <div className="relative flex items-center justify-between">
                          {/* Informações do inscrito */}
                          <div className="flex items-center gap-4 flex-1">
                            {/* Número da ordem */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-lg ${
                              request.isSpeaking ? 'bg-gradient-to-br from-yellow-500 to-amber-600 ring-4 ring-yellow-400/30' :
                              request.hasSpoken ? 'bg-gradient-to-br from-orange-500 to-amber-600 ring-4 ring-orange-400/30' :
                              'bg-gradient-to-br from-gray-500 to-slate-600 ring-4 ring-gray-400/20'
                            } text-white`}>
                              {index + 1}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="text-xl font-bold text-white">{request.name}</h4>
                                {request.profession && (
                                  <Badge variant="outline" className="text-xs border-white/30 text-white/70 bg-amber-500/20">
                                    {request.profession}
                                  </Badge>
                                )}
                                {!request.profession && (
                                  <Badge variant="outline" className="text-xs border-white/30 text-white/70 bg-amber-500/20">
                                    Cidadão
                                  </Badge>
                                )}
                              </div>
                              <p className="text-white/70 text-sm line-clamp-2">{request.subject}</p>
                            </div>
                          </div>

                          {/* Status e timer */}
                          <div className="text-right ml-4">
                            <Badge className={`${statusColor} text-white px-4 py-2 mb-2`}>
                              {statusIcon} {statusText}
                            </Badge>
                            
                            {/* Timer quando está falando */}
                            {request.isSpeaking && request.timeLimit && (
                              <div className="mt-2">
                                <div className="text-2xl font-mono font-bold text-white">
                                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                                </div>
                                <div className="text-xs text-white/60">
                                  Limite: {request.timeLimit} min
                                </div>
                                {/* Barra de progresso do tempo */}
                                <div className="mt-2 w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                      timeRemaining < 60 ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                                      timeRemaining < 120 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                      'bg-gradient-to-r from-yellow-400 to-amber-500'
                                    }`}
                                    style={{
                                      width: `${Math.max(0, (timeRemaining / (request.timeLimit * 60)) * 100)}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Tela de Resultado da Votação (quando finalizada) */}
        {votingResult && (
          <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 h-full">
              <div className="text-center space-y-8">
                <div className="relative">
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <CheckCircle className="h-16 w-16 text-green-400 drop-shadow-lg" />
                      <div className="absolute inset-0 h-16 w-16 text-green-400/30 animate-ping"></div>
                    </div>
                  </div>
                  <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-green-200 mt-4 tracking-wide">
                    RESULTADO DA VOTAÇÃO
                  </h3>
                  <p className="text-xl text-green-100/90 font-medium mt-2">
                    {votingResult.title}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center bg-green-500/20 p-6 rounded-2xl backdrop-blur-sm border border-green-400/30">
                    <div className="text-5xl font-bold text-green-400 mb-2">
                      {votingResult.results.yes}
                    </div>
                    <div className="text-lg text-green-300 uppercase tracking-wide">
                      Favoráveis
                    </div>
                  </div>
                  <div className="text-center bg-red-500/20 p-6 rounded-2xl backdrop-blur-sm border border-red-400/30">
                    <div className="text-5xl font-bold text-red-400 mb-2">
                      {votingResult.results.no}
                    </div>
                    <div className="text-lg text-red-300 uppercase tracking-wide">
                      Contrários
                    </div>
                  </div>
                  <div className="text-center bg-yellow-500/20 p-6 rounded-2xl backdrop-blur-sm border border-yellow-400/30">
                    <div className="text-5xl font-bold text-yellow-400 mb-2">
                      {votingResult.results.abstention || 0}
                    </div>
                    <div className="text-lg text-yellow-300 uppercase tracking-wide">
                      Abstenções
                    </div>
                  </div>
                </div>

                <div className={`inline-flex items-center px-8 py-4 rounded-2xl font-bold text-2xl text-white shadow-2xl backdrop-blur-sm border-2 ${
                  votingResult.results.status === 'APPROVED' || votingResult.results.approved
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 border-emerald-300/40 shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-red-500 to-rose-600 border-red-300/40 shadow-red-500/30'
                }`}>
                  <div className={`w-4 h-4 rounded-full mr-4 bg-white animate-pulse`}></div>
                  {votingResult.results.status === 'APPROVED' || votingResult.results.approved ? '✅ APROVADO' : '❌ REJEITADO'}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vereador Falando nas Considerações Finais */}
        {currentSpeaker && sessionData.status === 'CONSIDERACOES_FINAIS' && !attendanceData?.isAttendanceOpen && (
          <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 h-full">
              <div className="flex items-center mb-6">
                <Mic className="h-8 w-8 mr-3 text-green-400" />
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {currentSpeaker.user.fullName}
                  </h3>
                  <p className="text-lg opacity-80">
                    Considerações Finais - {currentSpeaker.subject}
                  </p>
                </div>
                <div className="ml-auto">
                  <Badge className="bg-green-600 text-white border-0 animate-pulse">
                    AO VIVO
                  </Badge>
                </div>
              </div>

              {/* Processos Legislativos do Vereador */}
              {currentSpeaker.legislativeProcesses.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <BookOpen className="h-6 w-6 mr-2 text-blue-400" />
                    <h4 className="text-xl font-semibold text-white">
                      Processos Legislativos do Vereador
                    </h4>
                  </div>
                  
                  <ScrollArea className="h-[calc(100%-180px)]">
                    <div className="space-y-4">
                      {currentSpeaker.legislativeProcesses.map((process) => (
                        <div key={process.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-semibold text-white">
                              {process.number} - {process.title}
                            </h5>
                            <Badge 
                              variant="outline" 
                              className="text-xs border-white/30 text-white/80"
                            >
                              {process.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-white/80 leading-relaxed">
                            {process.description}
                          </p>
                          <div className="mt-2">
                            <Badge 
                              className={`text-xs ${
                                process.status === 'EM_TRAMITACAO' ? 'bg-yellow-600' :
                                process.status === 'APROVADO' ? 'bg-green-600' :
                                'bg-red-600'
                              } text-white border-0`}
                            >
                              {process.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
              
              {/* Mensagem se não há processos */}
              {currentSpeaker.legislativeProcesses.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-white/60">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">
                      O vereador não possui processos legislativos cadastrados
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Documento Sendo Lido (quando não há chamada aberta, votação ativa ou fala ativa) */}
        {readingDocument && !attendanceData?.isAttendanceOpen && !(sessionData.currentVoting && sessionData.currentVoting.isActive) && !currentSpeaker && (
          <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden">
            <CardContent className="p-6 h-full flex flex-col">
              {/* Header do documento */}
              <div className="mb-4 border-b border-white/20 pb-4 flex-shrink-0">
                <div className="flex items-start gap-3">
                  <FileText className="h-8 w-8 text-yellow-400 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-white mb-2 break-words">{readingDocument.title}</h3>
                    <div className="flex flex-wrap gap-2 items-center text-sm">
                      <Badge variant="outline" className="border-yellow-400/50 text-yellow-400">
                        {readingDocument.type}
                      </Badge>
                      {readingDocument.author && (
                        <span className="text-white/70">
                          Autor: {readingDocument.author}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Conteúdo com scroll automático */}
              <div className="flex-1 overflow-hidden relative">
                <div 
                  className="text-lg leading-relaxed text-white/90 transition-transform duration-100"
                  style={{
                    transform: `translateY(-${scrollPosition}px)`
                  }}
                >
                  {readingDocument.content.split('\n').map((paragraph: string, index: number) => (
                    <p key={index} className="mb-4">
                      {paragraph}
                    </p>
                  ))}
                  {/* Espaço extra no final para scroll completo */}
                  <div className="h-96"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Painel vazio quando não há conteúdo */}
        {!readingDocument && !currentSpeaker && !attendanceData?.isAttendanceOpen && !(sessionData.currentVoting && sessionData.currentVoting.isActive) && (
          <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 h-full flex items-center justify-center">
              <div className="text-center text-white/60">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">
                  {sessionData.status === 'CONSIDERACOES_FINAIS' ? 
                    'Aguardando vereador para considerações finais' :
                    'Nenhum documento sendo exibido no momento'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {/* Votação Ativa */}
          {sessionData.currentVoting && (
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Vote className="h-8 w-8 mr-3 text-red-400" />
                  <div>
                    <h3 className="text-xl font-bold text-white">VOTAÇÃO EM ANDAMENTO</h3>
                    <div className="space-y-1">
                      <p className="opacity-80">{sessionData.currentVoting.title}</p>
                      {sessionData.currentVoting.type === 'document' && sessionData.currentVoting.documentType && (
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs border-white/30 text-white/70">
                            {sessionData.currentVoting.documentType}
                          </Badge>
                          {sessionData.currentVoting.author && (
                            <span className="text-xs text-white/60">
                              Autor: {sessionData.currentVoting.author}
                            </span>
                          )}
                        </div>
                      )}
                      {sessionData.currentVoting.type === 'matter' && (
                        <Badge variant="outline" className="text-xs border-white/30 text-white/70">
                          MATÉRIA
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Votos SIM */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-green-400 font-semibold">FAVORÁVEL</span>
                      <span className="text-green-400 font-bold">
                        {sessionData.currentVoting.votes.yes}
                      </span>
                    </div>
                    <Progress 
                      value={(sessionData.currentVoting.votes.yes / sessionData.currentVoting.totalVoters) * 100}
                      className="h-3 bg-white/20"
                    />
                  </div>

                  {/* Votos NÃO */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-400 font-semibold">CONTRÁRIO</span>
                      <span className="text-red-400 font-bold">
                        {sessionData.currentVoting.votes.no}
                      </span>
                    </div>
                    <Progress 
                      value={(sessionData.currentVoting.votes.no / sessionData.currentVoting.totalVoters) * 100}
                      className="h-3 bg-white/20"
                    />
                  </div>

                  {/* Abstenções */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-yellow-400 font-semibold">ABSTENÇÃO</span>
                      <span className="text-yellow-400 font-bold">
                        {sessionData.currentVoting.votes.abstention}
                      </span>
                    </div>
                    <Progress 
                      value={(sessionData.currentVoting.votes.abstention / sessionData.currentVoting.totalVoters) * 100}
                      className="h-3 bg-white/20"
                    />
                  </div>

                  <div className="text-center pt-4 border-t border-white/20">
                    <div className="flex items-center justify-center">
                      <Users className="h-5 w-5 mr-2" />
                      <span className="font-semibold">
                        {sessionData.currentVoting.votes.yes + sessionData.currentVoting.votes.no + sessionData.currentVoting.votes.abstention} 
                        / {sessionData.currentVoting.totalVoters} votaram
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timer */}
          {sessionData.timer?.isActive && (
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 mr-3 text-orange-400" />
                  <h3 className="text-xl font-bold text-white">
                    {sessionData.timer.phase}
                  </h3>
                </div>
                
                <div className="text-6xl font-mono font-bold text-orange-400 mb-4">
                  {formatTimer(sessionData.timer.timeRemaining)}
                </div>
                
                <Progress 
                  value={sessionData.timer.timeRemaining > 0 ? (sessionData.timer.timeRemaining / 300) * 100 : 0}
                  className="h-3 bg-white/20"
                />
                
                <p className="text-sm opacity-80 mt-2">
                  Tempo restante
                </p>
              </CardContent>
            </Card>
          )}

          {/* Informações da Sessão */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">STATUS DA SESSÃO</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="opacity-80">Data:</span>
                  <span className="font-semibold">
                    {new Date(sessionData.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="opacity-80">Sessão:</span>
                  <span className="font-semibold">Nº {sessionData.sessionNumber}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="opacity-80">Fase Atual:</span>
                  <Badge className={`${statusInfo.color} text-white border-0`}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}