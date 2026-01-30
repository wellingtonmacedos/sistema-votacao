import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Buscar sessão ativa
    const currentSession = await prisma.votingSession.findFirst({
      where: {
        status: {
          not: 'CLOSED'
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    if (!currentSession) {
      return NextResponse.json(null)
    }

    // Buscar total de vereadores e presidente ativos
    const totalCouncilors = await prisma.user.count({
      where: {
        role: { in: ['COUNCILOR', 'PRESIDENT'] },
        isActive: true
      }
    })

    // Buscar todos os vereadores e presidente para exibir na lista
    const allCouncilors = await prisma.user.findMany({
      where: {
        role: { in: ['COUNCILOR', 'PRESIDENT'] },
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        photoUrl: true,
        party: true,
        partyLogoUrl: true
      },
      orderBy: [
        { role: 'asc' }, // PRESIDENT vem antes de COUNCILOR alfabeticamente
        { fullName: 'asc' }
      ]
    })

    // Buscar registros de presença da sessão atual
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        sessionId: currentSession.id
      }
    })

    // Criar mapa de presença
    const presenceMap = new Map(
      attendanceRecords.map(a => [a.userId, { isPresent: a.isPresent, arrivedAt: a.arrivedAt }])
    )

    // Criar lista completa de vereadores com status de presença
    const attendanceData = allCouncilors.map(councilor => {
      const presence = presenceMap.get(councilor.id)
      return {
        id: councilor.id,
        isPresent: presence?.isPresent || false,
        arrivedAt: presence?.arrivedAt || null,
        user: {
          id: councilor.id,
          fullName: councilor.fullName,
          role: councilor.role,
          photoUrl: councilor.photoUrl || null,
          party: councilor.party || null,
          partyLogoUrl: councilor.partyLogoUrl || null
        }
      }
    })

    const presentCount = attendanceData.filter(a => a.isPresent).length

    const responseData = {
      sessionId: currentSession.id,
      isAttendanceOpen: currentSession.isAttendanceOpen,
      attendanceStartedAt: currentSession.attendanceStartedAt,
      attendanceEndedAt: currentSession.attendanceEndedAt,
      quorum: currentSession.quorum,
      attendances: attendanceData,
      presentCount: presentCount,
      totalCount: totalCouncilors,
      hasQuorum: presentCount >= currentSession.quorum
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Erro ao buscar lista de presença:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// Função mock para gerar partidos dos vereadores
function getPartyMock(fullName: string) {
  const parties = ['PSD', 'MDB', 'PP', 'PSDB', 'PT', 'PDT', 'REPUBLICANOS', 'PSL', 'CIDADANIA', 'PSB', 'PODE', 'PL', 'SOLIDARIEDADE'];
  const hash = fullName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return parties[hash % parties.length];
}

