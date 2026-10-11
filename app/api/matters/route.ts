import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Listar pautas (matérias) da sessão ativa ou de uma sessão específica
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    let votingSession;

    if (sessionId) {
      votingSession = await prisma.votingSession.findUnique({
        where: { id: sessionId },
      });
    } else {
      // Buscar sessão ativa (não fechada)
      votingSession = await prisma.votingSession.findFirst({
        where: {
          status: { not: "CLOSED" },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });
    }

    if (!votingSession) {
      return NextResponse.json({ session: null, matters: [] });
    }

    const sessionMatters = await prisma.sessionMatter.findMany({
      where: { sessionId: votingSession.id },
      include: {
        matter: {
          include: {
            votes: {
              include: {
                user: {
                  select: { fullName: true, party: true },
                },
              },
            },
          },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    const matters = sessionMatters.map((sm) => {
      const matter = sm.matter;
      const yesVotes = matter.votes.filter((v) => v.voteType === "YES").length;
      const noVotes = matter.votes.filter((v) => v.voteType === "NO").length;
      const abstentionVotes = matter.votes.filter((v) => v.voteType === "ABSTENTION").length;

      return {
        id: matter.id,
        title: matter.title,
        description: matter.description,
        status: matter.status,
        orderIndex: sm.orderIndex,
        yesVotes,
        noVotes,
        abstentionVotes,
        totalVotes: matter.votes.length,
      };
    });

    return NextResponse.json({
      session: {
        id: votingSession.id,
        title: votingSession.title,
        sessionNumber: votingSession.sessionNumber,
        status: votingSession.status,
        date: votingSession.date,
      },
      matters,
    });
  } catch (error) {
    console.error("Erro ao buscar pautas:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
