

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Controlar lista de presença/quórum
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || !['ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { action, sessionId } = await request.json();

    if (action === 'start') {
      // Iniciar chamada de presença
      const updatedSession = await prisma.votingSession.update({
        where: { id: sessionId },
        data: {
          isAttendanceOpen: true,
          attendanceStartedAt: new Date(),
          attendanceEndedAt: null
        }
      });

      return NextResponse.json({
        message: "Chamada de presença iniciada",
        session: updatedSession
      });
    }

    if (action === 'end') {
      // Encerrar chamada de presença
      const updatedSession = await prisma.votingSession.update({
        where: { id: sessionId },
        data: {
          isAttendanceOpen: false,
          attendanceEndedAt: new Date()
        }
      });

      // Contar presenças para verificar quórum
      const presentCount = await prisma.attendance.count({
        where: {
          sessionId: sessionId,
          isPresent: true
        }
      });

      return NextResponse.json({
        message: "Chamada de presença encerrada",
        session: updatedSession,
        presentCount,
        hasQuorum: presentCount >= updatedSession.quorum
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error('Erro no controle de presença:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
