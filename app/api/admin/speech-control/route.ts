import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/admin/speech-control
 * Inicia o pronunciamento de um vereador
 * Body: { speechRequestId: string, timeLimit: number (em minutos) }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'PRESIDENT')) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const { speechRequestId, timeLimit } = await request.json();

    if (!speechRequestId || !timeLimit) {
      return NextResponse.json(
        { error: 'ID da inscrição e tempo limite são obrigatórios' },
        { status: 400 }
      );
    }

    // Primeiro, finalizar qualquer pronunciamento ativo
    await prisma.speechRequest.updateMany({
      where: { isSpeaking: true },
      data: {
        isSpeaking: false,
        hasSpoken: true,
        endedAt: new Date(),
      },
    });

    // Iniciar o novo pronunciamento
    const speechRequest = await prisma.speechRequest.update({
      where: { id: speechRequestId },
      data: {
        isSpeaking: true,
        hasSpoken: false,
        startedAt: new Date(),
        timeLimit: timeLimit,
        endedAt: null,
      },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Pronunciamento iniciado',
      speechRequest: {
        id: speechRequest.id,
        name: speechRequest.user?.fullName || speechRequest.citizenName || 'N/A',
        subject: speechRequest.subject,
        isSpeaking: speechRequest.isSpeaking,
        timeLimit: speechRequest.timeLimit,
        startedAt: speechRequest.startedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Erro ao iniciar pronunciamento:', error);
    return NextResponse.json(
      { error: 'Erro ao iniciar pronunciamento' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/speech-control
 * Finaliza o pronunciamento ativo
 * Body: { speechRequestId: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'PRESIDENT')) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const { speechRequestId } = await request.json();

    if (!speechRequestId) {
      return NextResponse.json(
        { error: 'ID da inscrição é obrigatório' },
        { status: 400 }
      );
    }

    // Finalizar o pronunciamento
    const speechRequest = await prisma.speechRequest.update({
      where: { id: speechRequestId },
      data: {
        isSpeaking: false,
        hasSpoken: true,
        endedAt: new Date(),
      },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Pronunciamento finalizado',
      speechRequest: {
        id: speechRequest.id,
        name: speechRequest.user?.fullName || speechRequest.citizenName || 'N/A',
        hasSpoken: speechRequest.hasSpoken,
        endedAt: speechRequest.endedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Erro ao finalizar pronunciamento:', error);
    return NextResponse.json(
      { error: 'Erro ao finalizar pronunciamento' },
      { status: 500 }
    );
  }
}
