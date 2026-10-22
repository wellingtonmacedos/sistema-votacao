
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Vote, CheckCircle, X, Circle } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function VotingPage() {
  const { data: session } = useSession()
  const [activeVoting, setActiveVoting] = useState<any>(null)
  const [userVote, setUserVote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [presidentVotingStatus, setPresidentVotingStatus] = useState<{
    canVote: boolean
    message: string
  }>({
    canVote: false,
    message: 'O presidente só vota em caso de empate, após todos os vereadores presentes votarem.'
  })

  useEffect(() => {
    if (session?.user) {
      fetchActiveVoting()
      const interval = setInterval(fetchActiveVoting, 3000)
      return () => clearInterval(interval)
    }
  }, [session])

  const fetchActiveVoting = async () => {
    try {
      const response = await fetch('/api/admin/voting')
      if (response.ok) {
        const data = await response.json()
        setActiveVoting(data.activeVoting)
        
        // Buscar se o usuário já votou
        if (data.activeVoting) {
          const votesResponse = await fetch(
            `/api/vote?type=${data.activeVoting.type}&itemId=${data.activeVoting.id}`
          )
          if (votesResponse.ok) {
            const votesData = await votesResponse.json()
            const existingVote = votesData.votes.find((vote: any) => vote.user.id === session?.user?.id)
            setUserVote(existingVote?.voteType || null)

            if (session?.user?.role === 'PRESIDENT') {
              const attendanceResponse = await fetch('/api/public/attendance')
              if (attendanceResponse.ok) {
                const attendanceData = await attendanceResponse.json()
                const presentCouncilors = (attendanceData.attendances || []).filter(
                  (attendance: any) => attendance.isPresent && attendance.user?.role === 'COUNCILOR'
                ).length
                const councilorVotes = (votesData.votes || []).filter((vote: any) => vote.user?.role === 'COUNCILOR')
                const yesVotes = councilorVotes.filter((vote: any) => vote.voteType === 'YES').length
                const noVotes = councilorVotes.filter((vote: any) => vote.voteType === 'NO').length

                let message = 'O presidente só vota em caso de empate, após todos os vereadores presentes votarem.'
                let canVote = false

                if (existingVote) {
                  message = 'Você já exerceu o voto de desempate nesta votação.'
                } else if (presentCouncilors === 0) {
                  message = 'Ainda não há vereadores presentes para apurar um empate.'
                } else if (councilorVotes.length < presentCouncilors) {
                  message = 'Aguardando todos os vereadores presentes votarem.'
                } else if (yesVotes !== noVotes) {
                  message = 'Não há empate entre os vereadores presentes. O presidente não vota neste caso.'
                } else {
                  canVote = true
                  message = 'Empate confirmado. O voto de desempate do presidente está liberado.'
                }

                setPresidentVotingStatus({ canVote, message })
              }
            }
          }
        } else {
          setUserVote(null)
          if (session?.user?.role === 'PRESIDENT') {
            setPresidentVotingStatus({
              canVote: false,
              message: 'O presidente só vota em caso de empate, após todos os vereadores presentes votarem.'
            })
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar votação ativa:', error)
    }
  }

  const handleVote = async (voteType: 'YES' | 'NO' | 'ABSTENTION') => {
    if (!activeVoting || !session?.user) return

    setLoading(true)
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeVoting.type,
          itemId: activeVoting.id,
          voteType
        })
      })

      if (response.ok) {
        const result = await response.json()
        setUserVote(voteType)
        toast.success(`✅ ${result.message}`)
        await fetchActiveVoting()
      } else {
        const error = await response.json()
        toast.error(`❌ ${error.error}`)
      }
    } catch (error) {
      toast.error('❌ Erro de conexão ao registrar voto')
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-lg text-gray-600">
                Você precisa estar logado como vereador ou presidente para votar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!['COUNCILOR', 'PRESIDENT', 'ADMIN'].includes(session.user.role)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-lg text-gray-600">
                Apenas vereadores e presidente podem acessar esta página.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Votação
          </h1>
          <p className="text-gray-600">
            {session.user.role === 'PRESIDENT'
              ? 'O presidente só registra voto em caso de empate entre os vereadores presentes.'
              : 'Registre seu voto nas matérias e documentos em votação'}
          </p>
        </div>

        {!activeVoting ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Vote className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Nenhuma votação ativa
              </h3>
              <p className="text-gray-600">
                Aguarde até que uma nova votação seja iniciada pela mesa diretora.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Vote className="h-6 w-6 text-red-600" />
                <CardTitle className="text-red-800">
                  🗳️ VOTAÇÃO EM ANDAMENTO
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações da votação */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  {activeVoting.title}
                </h3>
                {activeVoting.description && (
                  <p className="text-red-700 mb-3">
                    {activeVoting.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-red-300 text-red-700">
                    {activeVoting.type === 'matter' ? 'MATÉRIA' : 'DOCUMENTO'}
                  </Badge>
                  {activeVoting.documentType && (
                    <Badge variant="outline" className="border-red-300 text-red-700">
                      {activeVoting.documentType}
                    </Badge>
                  )}
                  {activeVoting.author && (
                    <Badge variant="outline" className="border-red-300 text-red-700">
                      Autor: {activeVoting.author}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Status atual dos votos */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {activeVoting.votes.yes}
                  </div>
                  <div className="text-sm text-green-700">Favoráveis</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {activeVoting.votes.no}
                  </div>
                  <div className="text-sm text-red-700">Contrários</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {activeVoting.votes.abstention}
                  </div>
                  <div className="text-sm text-yellow-700">Abstenções</div>
                </div>
              </div>

              {/* Seu voto atual */}
              {userVote && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Seu voto atual:</span>
                    <Badge className={
                      userVote === 'YES' ? 'bg-green-600' :
                      userVote === 'NO' ? 'bg-red-600' : 'bg-yellow-600'
                    }>
                      {userVote === 'YES' ? '✅ FAVORÁVEL' :
                       userVote === 'NO' ? '❌ CONTRÁRIO' : '⚪ ABSTENÇÃO'}
                    </Badge>
                  </div>
                  <p className="text-sm text-blue-700 mt-2">
                    Seu voto já foi registrado nesta votação.
                  </p>
                </div>
              )}

              {session.user.role === 'PRESIDENT' && (
                <div className={`rounded-lg border p-4 ${presidentVotingStatus.canVote ? 'border-purple-200 bg-purple-50' : 'border-amber-200 bg-amber-50'}`}>
                  <p className={`text-sm font-medium ${presidentVotingStatus.canVote ? 'text-purple-800' : 'text-amber-800'}`}>
                    {presidentVotingStatus.message}
                  </p>
                </div>
              )}

              {/* Botões de votação */}
              <div className={`grid grid-cols-1 ${session.user.role === 'PRESIDENT' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                <Button
                  onClick={() => handleVote('YES')}
                  disabled={loading || (session.user.role === 'PRESIDENT' && !presidentVotingStatus.canVote)}
                  className={`h-16 text-lg ${
                    userVote === 'YES'
                      ? 'bg-green-700 hover:bg-green-800'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  <CheckCircle className="h-6 w-6 mr-2" />
                  FAVORÁVEL
                </Button>
                <Button
                  onClick={() => handleVote('NO')}
                  disabled={loading || (session.user.role === 'PRESIDENT' && !presidentVotingStatus.canVote)}
                  className={`h-16 text-lg ${
                    userVote === 'NO'
                      ? 'bg-red-700 hover:bg-red-800'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <X className="h-6 w-6 mr-2" />
                  CONTRÁRIO
                </Button>
                {session.user.role !== 'PRESIDENT' && (
                  <Button
                    onClick={() => handleVote('ABSTENTION')}
                    disabled={loading}
                    variant="outline"
                    className={`h-16 text-lg border-2 ${
                      userVote === 'ABSTENTION'
                        ? 'border-yellow-600 bg-yellow-50 text-yellow-800'
                        : 'border-yellow-500 hover:bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    <Circle className="h-6 w-6 mr-2" />
                    ABSTENÇÃO
                  </Button>
                )}
              </div>

              {/* Informações adicionais */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total de votantes: {activeVoting.totalVoters}</span>
                  <span>
                    Votaram: {activeVoting.votes.yes + activeVoting.votes.no + activeVoting.votes.abstention}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
