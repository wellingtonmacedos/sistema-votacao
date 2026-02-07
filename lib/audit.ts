import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function logAudit(action: string, details?: string, request?: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      console.warn("Audit log attempted without user session");
      return;
    }

    let ipAddress = null;
    let userAgent = null;

    if (request) {
      ipAddress = request.headers.get("x-forwarded-for") || "unknown";
      userAgent = request.headers.get("user-agent");
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
}
