import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import type { User } from "@prisma/client";

const { getServerSessionMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
}));

// Integração: mantém o Prisma REAL (banco de teste). Simulamos apenas a sessão
// do NextAuth, para alternar o usuário autenticado (admin/presidente/vereador).
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { prisma } from "@/lib/db";
import { resetDatabase, createUser } from "./helpers";
import { POST as createSession } from "@/app/api/admin/create-session/route";
import { POST as sessionControl } from "@/app/api/admin/session-control/route";
import { POST as attendanceControl } from "@/app/api/admin/attendance-control/route";
import { POST as registerAttendance } from "@/app/api/attendance/register/route";
import { POST as adminVoting } from "@/app/api/admin/voting/route";
import { POST as vote } from "@/app/api/vote/route";

function post(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function loginAs(user: User): void {
  getServerSessionMock.mockResolvedValue({
    user: { id: user.id, role: user.role, email: user.email },
  });
}

describe("Fluxo completo de sessão (integração com PostgreSQL)", () => {
  let admin: User;
  let president: User;
  let councilors: User[];

  beforeEach(async () => {
    await resetDatabase();
    admin = await createUser("ADMIN", "admin@camara.test", "Administrador");
    president = await createUser("PRESIDENT", "presidente@camara.test", "Presidente");
    councilors = [];
    for (let i = 1; i <= 7; i++) {
      councilors.push(
        await createUser("COUNCILOR", `vereador${i}@camara.test`, `Vereador ${i}`),
      );
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Abre a sessão pelo fluxo real (criar -> iniciar -> abrir chamada) e devolve o id.
  async function openSession(): Promise<string> {
    loginAs(admin);
    const created = await createSession(
      post("/api/admin/create-session", { title: "Sessão Ordinária" }),
    );
    expect(created.status).toBe(200);
    const { session } = await created.json();

    loginAs(admin);
    const started = await sessionControl(
      post("/api/admin/session-control", { action: "start", sessionId: session.id }),
    );
    expect(started.status).toBe(200);

    loginAs(admin);
    const opened = await attendanceControl(
      post("/api/admin/attendance-control", { action: "start", sessionId: session.id }),
    );
    expect(opened.status).toBe(200);

    return session.id;
  }

  async function registerPresence(sessionId: string, users: User[]): Promise<void> {
    for (const user of users) {
      loginAs(user);
      const res = await registerAttendance(
        post("/api/attendance/register", { sessionId }),
      );
      expect(res.status).toBe(200);
    }
  }

  it("abre a sessão, registra presença, vota uma matéria e encerra tudo", async () => {
    // 1. Admin cria a sessão
    loginAs(admin);
    const createdRes = await createSession(
      post("/api/admin/create-session", { title: "Sessão Ordinária" }),
    );
    expect(createdRes.status).toBe(200);
    const sessionId: string = (await createdRes.json()).session.id;

    // 2. Admin inicia a sessão -> PEQUENO_EXPEDIENTE e presenças criadas (ausentes)
    loginAs(admin);
    const startedRes = await sessionControl(
      post("/api/admin/session-control", { action: "start", sessionId }),
    );
    expect(startedRes.status).toBe(200);

    const afterStart = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    expect(afterStart?.status).toBe("PEQUENO_EXPEDIENTE");
    const attendances = await prisma.attendance.findMany({ where: { sessionId } });
    expect(attendances).toHaveLength(8); // 7 vereadores + presidente
    expect(attendances.every((a) => a.isPresent === false)).toBe(true);

    // 3. Admin abre a chamada de presença
    loginAs(admin);
    await attendanceControl(
      post("/api/admin/attendance-control", { action: "start", sessionId }),
    );

    // 4. Vereadores e presidente registram presença
    await registerPresence(sessionId, [...councilors, president]);

    // 5. Encerra a chamada -> quórum atingido (8 >= 7)
    loginAs(admin);
    const attendanceEnded = await attendanceControl(
      post("/api/admin/attendance-control", { action: "end", sessionId }),
    );
    const attendanceBody = await attendanceEnded.json();
    expect(attendanceBody.presentCount).toBe(8);
    expect(attendanceBody.hasQuorum).toBe(true);

    // 6. Matéria vinculada à sessão
    const matter = await prisma.matter.create({
      data: {
        title: "Projeto de Lei 01/2026",
        description: "Dispõe sobre teste de integração.",
        createdBy: president.id,
      },
    });
    await prisma.sessionMatter.create({ data: { sessionId, matterId: matter.id } });

    // 7. Presidente inicia a votação da matéria
    loginAs(president);
    const votingStarted = await adminVoting(
      post("/api/admin/voting", { action: "start", type: "matter", itemId: matter.id }),
    );
    expect(votingStarted.status).toBe(200);

    // 8. Votos: 3 SIM, 1 NÃO -> aprovado
    const votePlan: Array<[User, "YES" | "NO"]> = [
      [councilors[0], "YES"],
      [councilors[1], "YES"],
      [councilors[2], "NO"],
      [president, "YES"],
    ];
    for (const [user, voteType] of votePlan) {
      loginAs(user);
      const res = await vote(
        post("/api/vote", { type: "matter", itemId: matter.id, voteType }),
      );
      expect(res.status).toBe(200);
    }

    // Voto duplicado é bloqueado
    loginAs(councilors[0]);
    const duplicate = await vote(
      post("/api/vote", { type: "matter", itemId: matter.id, voteType: "YES" }),
    );
    expect(duplicate.status).toBe(400);

    // 9. Encerra a votação -> resultado calculado
    loginAs(president);
    const votingEnded = await adminVoting(
      post("/api/admin/voting", { action: "end", type: "matter", itemId: matter.id }),
    );
    const votingBody = await votingEnded.json();
    expect(votingBody.results).toEqual({
      yes: 3,
      no: 1,
      abstention: 0,
      status: "APPROVED",
    });

    // 10. Encerra a sessão
    loginAs(admin);
    const closedRes = await sessionControl(
      post("/api/admin/session-control", { action: "end", sessionId }),
    );
    expect(closedRes.status).toBe(200);

    const closed = await prisma.votingSession.findUnique({ where: { id: sessionId } });
    expect(closed?.status).toBe("CLOSED");
    expect(closed?.isAttendanceOpen).toBe(false);

    // Trilha de auditoria registrada em todo o fluxo
    const actions = (await prisma.auditLog.findMany()).map((log) => log.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "SESSAO_CRIADA",
        "SESSAO_INICIADA",
        "SESSAO_ENCERRADA",
        "VOTACAO_INICIADA",
        "VOTACAO_ENCERRADA",
      ]),
    );
  });

  it("bloqueia o voto de quem não registrou presença", async () => {
    const sessionId = await openSession();

    // Apenas os 3 primeiros vereadores registram presença.
    await registerPresence(sessionId, councilors.slice(0, 3));

    const matter = await prisma.matter.create({
      data: { title: "Projeto 02/2026", description: "Teste.", createdBy: president.id },
    });
    await prisma.sessionMatter.create({ data: { sessionId, matterId: matter.id } });

    loginAs(president);
    await adminVoting(
      post("/api/admin/voting", { action: "start", type: "matter", itemId: matter.id }),
    );

    // Vereador ausente (índice 5) tenta votar
    loginAs(councilors[5]);
    const res = await vote(
      post("/api/vote", { type: "matter", itemId: matter.id, voteType: "YES" }),
    );
    expect(res.status).toBe(403);

    // Nenhum voto foi persistido
    expect(await prisma.vote.count({ where: { matterId: matter.id } })).toBe(0);
  });

  it("vota e encerra um documento da sessão", async () => {
    const sessionId = await openSession();
    await registerPresence(sessionId, councilors.slice(0, 3));

    const document = await prisma.document.create({
      data: {
        sessionId,
        title: "Ata da sessão anterior",
        type: "ATA",
        createdBy: president.id,
      },
    });

    // Admin inicia a votação do documento
    loginAs(admin);
    const started = await adminVoting(
      post("/api/admin/voting", { action: "start", type: "document", itemId: document.id }),
    );
    expect(started.status).toBe(200);

    // Dois vereadores votam
    loginAs(councilors[0]);
    await vote(post("/api/vote", { type: "document", itemId: document.id, voteType: "YES" }));
    loginAs(councilors[1]);
    await vote(post("/api/vote", { type: "document", itemId: document.id, voteType: "NO" }));

    // Admin encerra -> 1 SIM x 1 NÃO -> não aprovado (empate não aprova)
    loginAs(admin);
    const ended = await adminVoting(
      post("/api/admin/voting", { action: "end", type: "document", itemId: document.id }),
    );
    const body = await ended.json();
    expect(body.results).toEqual({ yes: 1, no: 1, approved: false });

    const saved = await prisma.document.findUnique({ where: { id: document.id } });
    expect(saved?.isVoting).toBe(false);
    expect(saved?.isApproved).toBe(false);
  });
});
