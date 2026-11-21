import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";

// Hash fixo reaproveitado por todos os usuários de teste (evita o custo do
// bcrypt a cada criação). A senha em claro é irrelevante para os fluxos testados.
const PASSWORD_HASH = bcrypt.hashSync("Senha@123", 10);

// Zera o banco de teste entre os casos. TRUNCATE ... CASCADE resolve as FKs;
// RESTART IDENTITY reinicia sequências. Inclui TODAS as tabelas mapeadas.
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
        "audit_logs",
        "document_votes",
        "documents",
        "votes",
        "session_matters",
        "matters",
        "attendances",
        "speech_requests",
        "legislative_processes",
        "session_script_items",
        "session_phases",
        "voting_sessions",
        "document_types",
        "phases",
        "accounts",
        "sessions",
        "verification_tokens",
        "users"
      RESTART IDENTITY CASCADE`,
  );
}

export async function createUser(
  role: User["role"],
  email: string,
  fullName: string,
): Promise<User> {
  return prisma.user.create({
    data: { email, fullName, role, password: PASSWORD_HASH, isActive: true },
  });
}
