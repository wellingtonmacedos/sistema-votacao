

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody, sessionControlSchema, ValidationError } from "@/lib/validations";

// Controlar sessão (iniciar/encerrar)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.role || !['ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { action, sessionId } = parseBody(sessionControlSchema, body);

    if (action === 'start') {
      const now = new Date();

      const existingScheduledPhase = await prisma.sessionPhase.findFirst({
        where: { sessionId, phase: 'SCHEDULED' }
      });

      if (!existingScheduledPhase) {
        await prisma.sessionPhase.create({
          data: {
            sessionId,
            phase: 'SCHEDULED',
            startedAt: (await prisma.votingSession.findUnique({ where: { id: sessionId } }))?.createdAt || now,
            endedAt: now
          }
        });
      } else if (!existingScheduledPhase.endedAt) {
        await prisma.sessionPhase.update({
          where: { id: existingScheduledPhase.id },
          data: { endedAt: now }
        });
      }

      const existingPequenoPhase = await prisma.sessionPhase.findFirst({
        where: { sessionId, phase: 'PEQUENO_EXPEDIENTE', endedAt: null }
      });
      if (!existingPequenoPhase) {
        await prisma.sessionPhase.create({
          data: {
            sessionId,
            phase: 'PEQUENO_EXPEDIENTE',
            startedAt: now
          }
        });
      }

      // Iniciar sessão
      const updatedSession = await prisma.votingSession.update({
        where: { id: sessionId },
        data: {
          status: 'PEQUENO_EXPEDIENTE',
          currentPhase: 'PEQUENO_EXPEDIENTE',
          startedAt: now
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
      const now = new Date();

      // Fechar a fase atual aberta (sem endedAt)
      const openPhase = await prisma.sessionPhase.findFirst({
        where: { sessionId, endedAt: null },
        orderBy: { startedAt: 'desc' }
      });
      if (openPhase) {
        await prisma.sessionPhase.update({
          where: { id: openPhase.id },
          data: { endedAt: now }
        });
      }

      // Garantir que a fase CLOSED exista (fechando a sessao)
      const closedPhase = await prisma.sessionPhase.findFirst({
        where: { sessionId, phase: 'CLOSED' }
      });
      if (!closedPhase) {
        await prisma.sessionPhase.create({
          data: {
            sessionId,
            phase: 'CLOSED',
            startedAt: now,
            endedAt: now
          }
        });
      } else if (!closedPhase.endedAt) {
        await prisma.sessionPhase.update({
          where: { id: closedPhase.id },
          data: { endedAt: now }
        });
      }

      // Encerrar sessão
      const updatedSession = await prisma.votingSession.update({
        where: { id: sessionId },
        data: {
          status: 'CLOSED',
          currentPhase: 'CLOSED',
          endedAt: now,
          isAttendanceOpen: false,
          attendanceEndedAt: now
        }
      });

      return NextResponse.json({
        message: "Sessão encerrada com sucesso",
        session: updatedSession
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro no controle de sessão:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
