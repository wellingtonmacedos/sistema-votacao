import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { parseBody, setupAdminSchema, ValidationError } from "@/lib/validations";
import { isSetupEnabled, isSetupRequired, verifySetupToken } from "@/lib/setup";
import { logAuditEvent } from "@/lib/audit";
import { buildRateLimitKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Estado do setup (público): usado pela tela /setup para decidir o que mostrar.
export async function GET() {
  try {
    const [setupRequired] = await Promise.all([isSetupRequired()]);
    return NextResponse.json({ setupRequired, setupEnabled: isSetupEnabled() });
  } catch (error) {
    console.error("Erro ao verificar o setup:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Cria o administrador inicial. Disponível apenas uma vez por instância.
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);

    const limit = await rateLimit(buildRateLimitKey("setup", ip));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Muitas tentativas. Tente novamente em ${limit.retryAfter}s.` },
        {
          status: 429,
          headers: limit.retryAfter ? { "Retry-After": String(limit.retryAfter) } : undefined,
        }
      );
    }

    if (!isSetupEnabled()) {
      return NextResponse.json(
        { error: "Configuração inicial desabilitada. Defina a variável SETUP_TOKEN no servidor." },
        { status: 503 }
      );
    }

    if (!(await isSetupRequired())) {
      return NextResponse.json({ error: "O sistema já foi configurado." }, { status: 409 });
    }

    const body = await request.json();
    const data = parseBody(setupAdminSchema, body);

    if (!verifySetupToken(data.token)) {
      return NextResponse.json({ error: "Token de configuração inválido." }, { status: 403 });
    }

    const email = data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Este email já está cadastrado." }, { status: 400 });
    }

    const admin = await prisma.user.create({
      data: {
        email,
        fullName: data.fullName,
        password: await bcrypt.hash(data.password, 12),
        role: "ADMIN",
        isActive: true,
        mustChangePassword: false,
      },
      select: { id: true, email: true, fullName: true },
    });

    await logAuditEvent({
      action: "SETUP_ADMIN_CRIADO",
      userId: admin.id,
      details: `Administrador inicial criado: ${admin.email}`,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true, user: admin }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Erro no setup:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
