import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody, updateSessionScriptProgressSchema, ValidationError } from "@/lib/validations";

async function getTargetSession(sessionId?: string | null) {
  if (sessionId) {
    return prisma.votingSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        title: true,
        sessionNumber: true,
        status: true,
        date: true,
      },
    });
  }

  return prisma.votingSession.findFirst({
    where: {
      status: {
        not: "CLOSED",
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      sessionNumber: true,
      status: true,
      date: true,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (!["PRESIDENT", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const targetSession = await getTargetSession(sessionId);

    if (!targetSession) {
      return NextResponse.json({ session: null, items: [], summary: null });
    }

    const items = await prisma.sessionScriptItem.findMany({
      where: { sessionId: targetSession.id },
      orderBy: { orderIndex: "asc" },
      select: {
        id: true,
        sectionTitle: true,
        content: true,
        orderIndex: true,
        isCompleted: true,
        completedAt: true,
        presidentNotes: true,
      },
    });

    return NextResponse.json({
      session: targetSession,
      items,
      summary: {
        total: items.length,
        completed: items.filter((item) => item.isCompleted).length,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar roteiro do presidente:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== "PRESIDENT") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { itemId, isCompleted, presidentNotes } = parseBody(updateSessionScriptProgressSchema, body);

    const existingItem = await prisma.sessionScriptItem.findUnique({
      where: { id: itemId },
      select: { id: true },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item do roteiro não encontrado" }, { status: 404 });
    }

    const updatedItem = await prisma.sessionScriptItem.update({
      where: { id: itemId },
      data: {
        ...(typeof isCompleted === "boolean"
          ? {
              isCompleted,
              completedAt: isCompleted ? new Date() : null,
            }
          : {}),
        ...(presidentNotes !== undefined
          ? {
              presidentNotes: presidentNotes?.trim() ? presidentNotes.trim() : null,
            }
          : {}),
      },
      select: {
        id: true,
        sectionTitle: true,
        content: true,
        orderIndex: true,
        isCompleted: true,
        completedAt: true,
        presidentNotes: true,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, errors: error.errors }, { status: 400 });
    }

    console.error("Erro ao atualizar andamento do roteiro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
