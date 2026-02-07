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

    const sessionData = await prisma.votingSession.findUnique({
      where: { id: sessionId },
      include: {
        matters: {
          include: {
            matter: {
              include: {
                votes: {
                  include: {
                    user: {
                      select: { fullName: true, party: true }
                    }
                  }
                }
              }
            }
          },
          orderBy: { orderIndex: 'asc' }
        },
        documents: {
          include: {
            votes: {
              include: {
                user: {
                  select: { fullName: true, party: true }
                }
              }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!sessionData) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    await logAudit('VIEW_REPORT', `Votes report for session ${sessionId}`, request);

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error('Erro ao gerar relatório de votações:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
