import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Criar nova sessão
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || !['ADMIN', 'PRESIDENT'].includes(session.user.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { title, date, sessionNumber } = await request.json();

    // Verificar se já existe uma sessão ativa
    const existingActiveSession = await prisma.votingSession.findFirst({
      where: {
        status: {
          not: 'CLOSED'
        }
      }
    });

    if (existingActiveSession) {
      return NextResponse.json(
        { error: "Já existe uma sessão ativa. Encerre a sessão atual antes de criar uma nova." },
        { status: 400 }
      );
    }

    // Gerar número de sessão automaticamente se não fornecido
    let finalSessionNumber = sessionNumber;
    if (!finalSessionNumber) {
      const lastSession = await prisma.votingSession.findFirst({
        orderBy: { sessionNumber: 'desc' }
      });
      
      if (lastSession?.sessionNumber) {
        // Extrair número da sessão (ex: "001/2024" -> 001)
        const match = lastSession.sessionNumber.match(/^(\d+)/);
        if (match) {
          const lastNumber = parseInt(match[1]);
          const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
          finalSessionNumber = `${nextNumber}/${new Date().getFullYear()}`;
        } else {
          finalSessionNumber = `001/${new Date().getFullYear()}`;
        }
      } else {
        finalSessionNumber = `001/${new Date().getFullYear()}`;
      }
    }

    // Obter ID do usuário logado
    const userId = session.user.id;
    
    // Criar a nova sessão
    const sessionDate = date ? new Date(date) : new Date();
    const newSession = await prisma.votingSession.create({
      data: {
        title: title || `Sessão Ordinária ${finalSessionNumber}`,
        sessionNumber: finalSessionNumber,
        date: sessionDate,
        scheduledAt: sessionDate,
        status: 'SCHEDULED',
        createdBy: userId
      }
    });

    return NextResponse.json({
      message: "Sessão criada com sucesso",
      session: newSession
    });
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
