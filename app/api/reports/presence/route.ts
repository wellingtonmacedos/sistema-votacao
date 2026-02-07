import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'PRESIDENT'].includes(session.user.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: "ID da sessão é obrigatório" }, { status: 400 });
    }

    // Buscar todos os vereadores ativos
    const councilors = await prisma.user.findMany({
      where: {
        role: { in: ['COUNCILOR', 'PRESIDENT'] },
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        party: true,
        photoUrl: true,
      },
      orderBy: { fullName: 'asc' }
    });

    // Buscar presenças da sessão
    const attendances = await prisma.attendance.findMany({
      where: { sessionId },
    });

    // Cruzar dados
    const presenceReport = councilors.map(councilor => {
      const attendance = attendances.find(a => a.userId === councilor.id);
      return {
        ...councilor,
        isPresent: !!attendance?.isPresent,
        arrivedAt: attendance?.arrivedAt,
      };
    });

    await logAudit('VIEW_REPORT', `Presence report for session ${sessionId}`, request);

    return NextResponse.json(presenceReport);
  } catch (error) {
    console.error('Erro ao gerar relatório de presença:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
