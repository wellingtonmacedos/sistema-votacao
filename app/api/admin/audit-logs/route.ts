import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// GET - Consulta os registros de auditoria (somente ADMIN).
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const q = searchParams.get('q');

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const rawPageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawPageSize));

    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (q) where.details = { contains: q, mode: 'insensitive' };

    const createdAt: Prisma.DateTimeFilter = {};
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) createdAt.gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) createdAt.lte = toDate;
    }
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

    const [total, logs, actionGroups] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      // Lista de ações disponíveis para o filtro (calculada apenas na 1ª página).
      page === 1
        ? prisma.auditLog.groupBy({ by: ['action'], orderBy: { action: 'asc' } })
        : Promise.resolve([] as { action: string }[]),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      actions: actionGroups.map((group) => group.action),
    });
  } catch (error) {
    console.error('Erro ao consultar auditoria:', error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
