
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Atualizar processo legislativo
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
    const { title, description, type, status, speechRequestId } = body;

    // Buscar o processo
    const existingProcess = await prisma.legislativeProcess.findUnique({
      where: { id: params.id }
    });

    if (!existingProcess) {
      return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
    }

    // Verificar permissões (próprio autor ou admin)
    if (session.user.role !== 'ADMIN' && existingProcess.userId !== session.user.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const process = await prisma.legislativeProcess.update({
      where: { id: params.id },
      data: {
        title,
        description,
        type,
        status,
        speechRequestId
      },
      include: {
        author: {
          select: { id: true, fullName: true }
        },
        speechRequest: {
          select: { id: true, subject: true }
        }
      }
    });

    return NextResponse.json(process);
  } catch (error) {
    console.error('Erro ao atualizar processo legislativo:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Deletar processo legislativo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar o processo
    const existingProcess = await prisma.legislativeProcess.findUnique({
      where: { id: params.id }
    });

    if (!existingProcess) {
      return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
    }

    // Verificar permissões (próprio autor ou admin)
    if (session.user.role !== 'ADMIN' && existingProcess.userId !== session.user.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    await prisma.legislativeProcess.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar processo legislativo:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
