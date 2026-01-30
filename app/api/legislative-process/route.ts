
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Listar processos legislativos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const speechRequestId = searchParams.get('speechRequestId');

    let where: any = {};

    // Se não for admin, mostrar apenas próprios processos
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (speechRequestId) {
      where.speechRequestId = speechRequestId;
    }

    const processes = await prisma.legislativeProcess.findMany({
      where,
      include: {
        author: {
          select: { id: true, fullName: true }
        },
        speechRequest: {
          select: { id: true, subject: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(processes);
  } catch (error) {
    console.error('Erro ao buscar processos legislativos:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Criar novo processo legislativo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Apenas vereadores e admin podem criar processos
    if (session.user.role !== 'COUNCILOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { number, title, description, type, speechRequestId } = body;

    if (!number || !title || !description || !type) {
      return NextResponse.json({ error: "Dados obrigatórios faltando" }, { status: 400 });
    }

    // Verificar se o número já existe
    const existingProcess = await prisma.legislativeProcess.findFirst({
      where: { number }
    });

    if (existingProcess) {
      return NextResponse.json({ error: "Número de processo já existe" }, { status: 400 });
    }

    const process = await prisma.legislativeProcess.create({
      data: {
        userId: session.user.id,
        number,
        title,
        description,
        type,
        speechRequestId
      },
      include: {
        author: {
          select: { id: true, fullName: true }
        }
      }
    });

    return NextResponse.json(process);
  } catch (error) {
    console.error('Erro ao criar processo legislativo:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
