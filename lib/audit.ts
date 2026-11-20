import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface AuditEventInput {
  action: string;
  // Nulo quando não há usuário identificado (ex.: login com email inexistente).
  userId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Grava um evento de auditoria com dados explícitos. Usado quando não há sessão
// autenticada — notadamente nas tentativas de login, antes de autenticar.
export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: event.action,
        userId: event.userId ?? null,
        details: event.details ?? null,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
}

// Grava um evento atribuído ao usuário da sessão atual.
export async function logAudit(action: string, details?: string, request?: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      console.warn("Audit log attempted without user session");
      return;
    }

    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (request) {
      ipAddress = request.headers.get("x-forwarded-for") || "unknown";
      userAgent = request.headers.get("user-agent");
    }

    await logAuditEvent({ action, userId, details, ipAddress, userAgent });
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
}
