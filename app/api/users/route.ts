
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Apenas admin pode listar usuários
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let where: any = {};
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        photoUrl: true,
        party: true,
        partyLogoUrl: true,
        createdAt: true
      },
      orderBy: { fullName: 'asc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST - Criar novo usuário (vereador)
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
    const { email, fullName, password, role, party, photoUrl, partyLogoUrl } = body;

    if (!email || !fullName || !password) {
      return NextResponse.json(
        { error: "Email, nome completo e senha são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 400 }
      );
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        password: hashedPassword,
        role: role || 'COUNCILOR',
        isActive: true,
        party: party || null,
        photoUrl: photoUrl || null,
        partyLogoUrl: partyLogoUrl || null
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        photoUrl: true,
        party: true,
        partyLogoUrl: true,
        createdAt: true
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH - Atualizar usuário
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
    const { id, email, fullName, password, role, isActive, party, photoUrl, partyLogoUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    // Verificar se o email já existe (para outro usuário)
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: { email, NOT: { id } }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Este email já está cadastrado" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    // Campos de vereador - aceita string vazia para limpar
    if (party !== undefined) updateData.party = party || null;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null;
    if (partyLogoUrl !== undefined) updateData.partyLogoUrl = partyLogoUrl || null;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        photoUrl: true,
        party: true,
        partyLogoUrl: true,
        createdAt: true
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE - Desativar usuário
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

    // Não excluir, apenas desativar
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true, message: "Usuário desativado com sucesso" });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
