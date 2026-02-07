import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Listar todas as sessões
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const sessions = await prisma.votingSession.findMany({
      include: {
        creator: {
          select: {
            fullName: true
          }
        },
        _count: {
          select: {
            attendances: true,
            documents: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Erro ao buscar sessões:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST - Criar nova sessão
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, scheduledAt, sessionNumber, quorum } = body;

    if (!title || !scheduledAt) {
      return NextResponse.json(
        { error: "Título e data são obrigatórios" },
        { status: 400 }
      );
    }

    // Gerar número da sessão automaticamente se não fornecido
    let finalSessionNumber = sessionNumber;
    if (!finalSessionNumber) {
      const year = new Date().getFullYear();
      const count = await prisma.votingSession.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`)
          }
        }
      });
      // Formato: 001/2024
      finalSessionNumber = `${(count + 1).toString().padStart(3, '0')}/${year}`;
    }

    const votingSession = await prisma.votingSession.create({
      data: {
        title,
        description: description || null,
        scheduledAt: new Date(scheduledAt),
        date: new Date(scheduledAt),
        sessionNumber: finalSessionNumber, // String
        quorum: quorum || 7,
        createdBy: session.user.id,
        status: 'SCHEDULED'
      },
      include: {
        creator: {
          select: {
            fullName: true
          }
        }
      }
    });

    return NextResponse.json(votingSession);
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH - Atualizar sessão
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, description, scheduledAt, sessionNumber, quorum, status } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (scheduledAt) {
      updateData.scheduledAt = new Date(scheduledAt);
      updateData.date = new Date(scheduledAt);
    }
    if (sessionNumber) updateData.sessionNumber = sessionNumber;
    if (quorum) updateData.quorum = quorum;
    if (status) updateData.status = status;

    const votingSession = await prisma.votingSession.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            fullName: true
          }
        }
      }
    });

    return NextResponse.json(votingSession);
  } catch (error) {
    console.error('Erro ao atualizar sessão:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE - Excluir sessão (apenas se não iniciada)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    // Verificar se a sessão pode ser excluída
    const existingSession = await prisma.votingSession.findUnique({
      where: { id },
      include: {
        _count: {
          select: { attendances: true, documents: true }
        }
      }
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    if (existingSession.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: "Apenas sessões agendadas podem ser excluídas" },
        { status: 400 }
      );
    }

    await prisma.votingSession.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Sessão excluída com sucesso" });
  } catch (error) {
    console.error('Erro ao excluir sessão:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
