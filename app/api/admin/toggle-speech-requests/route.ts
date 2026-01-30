import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Abrir/Fechar inscricoes para fala
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    // Apenas admin ou presidente podem gerenciar inscricoes
    if (session.user.role !== 'ADMIN' && session.user.role !== 'PRESIDENT') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { sessionId, isOpen } = body;

    // Buscar a sessao
    const votingSession = await prisma.votingSession.findUnique({
      where: { id: sessionId }
    });

    if (!votingSession) {
      return NextResponse.json({ error: "Sessao nao encontrada" }, { status: 404 });
    }

    // Atualizar o status das inscricoes
    const updatedSession = await prisma.votingSession.update({
      where: { id: sessionId },
      data: { isSpeechRequestsOpen: isOpen }
    });

    return NextResponse.json({
      session: updatedSession,
      message: isOpen ? "Inscricoes abertas com sucesso" : "Inscricoes fechadas com sucesso"
    });
  } catch (error) {
    console.error('Erro ao gerenciar inscricoes:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
