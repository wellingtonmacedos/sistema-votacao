import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = 'force-dynamic'
export const revalidate = 0

const prisma = new PrismaClient();

// Buscar quem está falando atualmente e seus processos legislativos
export async function GET(request: NextRequest) {
  try {
    const currentSpeaker = await prisma.speechRequest.findFirst({
      where: { isSpeaking: true },
      include: {
        user: {
          select: { id: true, fullName: true }
        },
        session: {
          select: { id: true, title: true, status: true }
        },
        legislativeProcesses: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!currentSpeaker) {
      return NextResponse.json(null);
    }

    return NextResponse.json(currentSpeaker);
  } catch (error) {
    console.error('Erro ao buscar orador atual:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
