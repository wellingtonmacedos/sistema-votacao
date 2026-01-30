import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Buscar status da sessao ativa (incluindo status de inscricoes)
export async function GET(request: NextRequest) {
  try {
    const currentSession = await prisma.votingSession.findFirst({
      where: {
        status: {
          in: ['PEQUENO_EXPEDIENTE', 'GRANDE_EXPEDIENTE', 'ORDEM_DO_DIA', 'CONSIDERACOES_FINAIS', 'TRIBUNA_LIVE']
        }
      },
      select: {
        id: true,
        status: true,
        isSpeechRequestsOpen: true,
        sessionNumber: true,
        date: true
      }
    });

    if (!currentSession) {
      return NextResponse.json({ error: "Nenhuma sessao ativa encontrada" }, { status: 404 });
    }

    return NextResponse.json(currentSession);
  } catch (error) {
    console.error('Erro ao buscar status da sessao:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
