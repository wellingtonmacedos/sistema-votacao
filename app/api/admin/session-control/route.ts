

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { firstActivePhaseKey } from "@/lib/phases-server";

// Controlar sessão (iniciar/encerrar)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || !['ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { action, sessionId } = await request.json();

    if (action === 'start') {
      const firstPhase = await firstActivePhaseKey();
      if (!firstPhase) {
        return NextResponse.json({ error: "Nenhuma fase cadastrada. Cadastre as fases da sessão antes de iniciar." }, { status: 400 });
      }

      // Iniciar sessão
      const updatedSession = await prisma.votingSession.update({
        where: { id: sessionId },
        data: {
          status: firstPhase,
          startedAt: new Date()
        }
      });

      // Criar registros de presença para todos os vereadores
      const councilors = await prisma.user.findMany({
        where: {
          role: { in: ['COUNCILOR', 'PRESIDENT'] },
          isActive: true
        }
      });

      // Criar registros de presença em batch, ignorando os já existentes
      const existingAttendances = await prisma.attendance.findMany({
        where: { sessionId },
        select: { userId: true }
      });
      const alreadyRegistered = new Set(existingAttendances.map(a => a.userId));

      const missingAttendances = councilors
        .filter(councilor => !alreadyRegistered.has(councilor.id))
        .map(councilor => ({
          sessionId: sessionId,
          userId: councilor.id,
          isPresent: false
        }));

      if (missingAttendances.length > 0) {
        await prisma.attendance.createMany({ data: missingAttendances });
      }

      return NextResponse.json({
        message: "Sessão iniciada com sucesso",
        session: updatedSession
      });
    }

    if (action === 'end') {
      // Encerrar sessão
      const updatedSession = await prisma.votingSession.update({
        where: { id: sessionId },
        data: {
          status: 'CLOSED',
          endedAt: new Date(),
          isAttendanceOpen: false,
          attendanceEndedAt: new Date()
        }
      });

      return NextResponse.json({
        message: "Sessão encerrada com sucesso",
        session: updatedSession
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error('Erro no controle de sessão:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
