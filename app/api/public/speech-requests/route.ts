import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/public/speech-requests
 * Retorna as inscrições aprovadas da sessão ativa para exibição no painel público
 */
export async function GET() {
  try {
    // Buscar sessão ativa (não fechada)
    const activeSession = await prisma.votingSession.findFirst({
      where: { 
        status: {
          not: 'CLOSED'
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!activeSession) {
      return NextResponse.json({
        speechRequests: [],
        isSpeechRequestsOpen: false,
      });
    }

    // Buscar inscrições aprovadas da sessão ativa, ordenadas por orderIndex
    const speechRequests = await prisma.speechRequest.findMany({
      where: {
        sessionId: activeSession.id,
        isApproved: true,
      },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });

    // Formatar e separar por tipo
    const formatRequest = (request: any) => ({
      id: request.id,
      name: request.user?.fullName || request.citizenName || 'N/A',
      party: 'Vereador',
      profession: request.citizenProfession || null,
      subject: request.subject,
      isSpeaking: request.isSpeaking,
      hasSpoken: request.hasSpoken,
      timeLimit: request.timeLimit,
      startedAt: request.startedAt?.toISOString(),
      endedAt: request.endedAt?.toISOString(),
      orderIndex: request.orderIndex,
      type: request.type,
    });

    const consideracoesFinais = speechRequests
      .filter(req => req.type === 'CONSIDERACOES_FINAIS')
      .map(formatRequest);
    
    const tribunaLivre = speechRequests
      .filter(req => req.type === 'TRIBUNA_LIVE')
      .map(formatRequest);

    return NextResponse.json({
      speechRequests: speechRequests.map(formatRequest), // Mantém compatibilidade
      consideracoesFinais,
      tribunaLivre,
      isSpeechRequestsOpen: activeSession.isSpeechRequestsOpen,
    });
  } catch (error) {
    console.error('Erro ao buscar inscrições:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar inscrições' },
      { status: 500 }
    );
  }
}
