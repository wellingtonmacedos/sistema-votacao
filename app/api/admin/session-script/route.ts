import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody, saveSessionScriptSchema, ValidationError } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId é obrigatório" }, { status: 400 });
    }

    const votingSession = await prisma.votingSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        title: true,
        sessionNumber: true,
        status: true,
        date: true,
        scriptItems: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            sectionTitle: true,
            content: true,
            orderIndex: true,
            isCompleted: true,
            presidentNotes: true,
            completedAt: true,
          },
        },
      },
    });

    if (!votingSession) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    return NextResponse.json(votingSession);
  } catch (error) {
    console.error("Erro ao buscar roteiro da sessão:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { sessionId, items } = parseBody(saveSessionScriptSchema, body);

    const votingSession = await prisma.votingSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });

    if (!votingSession) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const existingItems = await tx.sessionScriptItem.findMany({
        where: { sessionId },
        select: { id: true },
      });

      const existingIds = new Set(existingItems.map((item) => item.id));
      const submittedIds = items
        .map((item) => item.id)
        .filter((itemId): itemId is string => Boolean(itemId));

      await tx.sessionScriptItem.deleteMany({
        where:
          submittedIds.length > 0
            ? {
                sessionId,
                id: { notIn: submittedIds },
              }
            : { sessionId },
      });

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const data = {
          sectionTitle: item.sectionTitle ?? null,
          content: item.content,
          orderIndex: item.orderIndex ?? index,
        };

        if (item.id && existingIds.has(item.id)) {
          await tx.sessionScriptItem.update({
            where: { id: item.id },
            data,
          });
        } else {
          await tx.sessionScriptItem.create({
            data: {
              sessionId,
              ...data,
            },
          });
        }
      }
    });

    const updatedItems = await prisma.sessionScriptItem.findMany({
      where: { sessionId },
      orderBy: { orderIndex: "asc" },
      select: {
        id: true,
        sectionTitle: true,
        content: true,
        orderIndex: true,
        isCompleted: true,
        presidentNotes: true,
        completedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      items: updatedItems,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, errors: error.errors }, { status: 400 });
    }

    console.error("Erro ao salvar roteiro da sessão:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
