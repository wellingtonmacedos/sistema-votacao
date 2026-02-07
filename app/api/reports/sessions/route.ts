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
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json({ error: "Mês e ano são obrigatórios" }, { status: 400 });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const sessions = await prisma.votingSession.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        _count: {
          select: {
            attendances: { where: { isPresent: true } },
            matters: true,
            documents: true,
          }
        }
      },
      orderBy: {
        date: 'asc',
      },
    });

    await logAudit('VIEW_REPORT', `Sessions report for ${month}/${year}`, request);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Erro ao gerar relatório de sessões:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
