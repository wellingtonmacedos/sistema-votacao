import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

// Provisionamento do administrador inicial (onboarding).
//
// O setup só fica disponível enquanto não existir nenhum administrador ativo e
// enquanto a variável SETUP_TOKEN estiver definida no servidor. Assim, uma
// instância recém-publicada pode ser inicializada uma única vez, sem deixar uma
// tela de criação de admin exposta permanentemente.

export const SETUP_TOKEN_ENV = "SETUP_TOKEN";

// O setup está habilitado apenas quando o operador definiu SETUP_TOKEN.
// Sem a variável, o setup falha fechado (não permite criar admin).
export function isSetupEnabled(): boolean {
  return !!process.env[SETUP_TOKEN_ENV];
}

// Só é possível configurar enquanto não houver nenhum administrador ativo.
export async function isSetupRequired(): Promise<boolean> {
  const adminCount = await prisma.user.count({
    where: { role: "ADMIN", isActive: true },
  });
  return adminCount === 0;
}

// Comparação em tempo constante (evita vazar o token por timing de resposta).
export function verifySetupToken(candidate: unknown): boolean {
  const expected = process.env[SETUP_TOKEN_ENV];
  if (!expected) return false;
  if (typeof candidate !== "string") return false;

  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}
