
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Atualizar solicitação de fala
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { isApproved, hasSpoken, isSpeaking } = body;

    // Apenas admin pode aprovar/gerenciar falas
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Se está marcando como falando, desmarcar todos os outros
    if (isSpeaking) {
      await prisma.speechRequest.updateMany({
        where: { isSpeaking: true },
        data: { isSpeaking: false }
      });
    }

    const speechRequest = await prisma.speechRequest.update({
      where: { id: params.id },
      data: {
        isApproved,
        hasSpoken,
        isSpeaking
      },
      include: {
        user: {
          select: { id: true, fullName: true }
        },
        legislativeProcesses: true
      }
    });

    return NextResponse.json(speechRequest);
  } catch (error) {
    console.error('Erro ao atualizar solicitação de fala:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Deletar solicitação de fala
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar a solicitação
    const speechRequest = await prisma.speechRequest.findUnique({
      where: { id: params.id }
    });

    if (!speechRequest) {
      return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });
    }

    // Verificar permissões (próprio usuário ou admin)
    if (session.user.role !== 'ADMIN' && speechRequest.userId !== session.user.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    await prisma.speechRequest.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar solicitação de fala:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
