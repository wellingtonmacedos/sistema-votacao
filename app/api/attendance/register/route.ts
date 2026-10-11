

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody, attendanceRegisterSchema, ValidationError } from "@/lib/validations";

// Registrar presença do vereador
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || !['COUNCILOR', 'PRESIDENT'].includes(session.user.role)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { sessionId } = parseBody(attendanceRegisterSchema, body);

    // Verificar se a sessão existe e se a chamada está aberta
    const votingSession = await prisma.votingSession.findUnique({
      where: { id: sessionId }
    });

    if (!votingSession) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    if (!votingSession.isAttendanceOpen) {
      return NextResponse.json({ error: "Chamada de presença não está aberta" }, { status: 400 });
    }

    // Registrar ou atualizar presença
    await prisma.attendance.upsert({
      where: {
        sessionId_userId: {
          sessionId: sessionId,
          userId: session.user.id
        }
      },
      update: {
        isPresent: true,
        arrivedAt: new Date(),
        absenceJustification: null,
        absenceJustifiedAt: null,
        absenceJustifiedBy: null
      },
      create: {
        sessionId: sessionId,
        userId: session.user.id,
        isPresent: true,
        arrivedAt: new Date()
      }
    });

    return NextResponse.json({
      message: "Presença registrada com sucesso"
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro ao registrar presença:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
