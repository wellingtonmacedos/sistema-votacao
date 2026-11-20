import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getServerSessionMock, logAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    sessionPhase: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    votingSession: { findUnique: vi.fn(), update: vi.fn() },
    user: { findMany: vi.fn() },
    attendance: { findMany: vi.fn(), createMany: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  logAuditMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/audit", () => ({ logAudit: logAuditMock }));

import { POST } from "@/app/api/admin/session-control/route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/session-control", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSessionMock.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
  prismaMock.sessionPhase.findFirst.mockResolvedValue(null);
  prismaMock.sessionPhase.create.mockResolvedValue({ id: "p1" });
  prismaMock.sessionPhase.update.mockResolvedValue({});
  prismaMock.votingSession.findUnique.mockResolvedValue({ createdAt: new Date("2026-01-01T00:00:00Z") });
  prismaMock.votingSession.update.mockResolvedValue({ sessionNumber: "12", title: "Sessão Ordinária" });
  prismaMock.user.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
  prismaMock.attendance.findMany.mockResolvedValue([{ userId: "c1" }]);
  prismaMock.attendance.createMany.mockResolvedValue({ count: 1 });
});

describe("POST /api/admin/session-control - autorização", () => {
  it("retorna 401 sem sessão", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await POST(postReq({ action: "start", sessionId: "s1" }));
    expect(res.status).toBe(401);
  });

  it("retorna 401 para papel diferente de ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1", role: "PRESIDENT" } });
    const res = await POST(postReq({ action: "start", sessionId: "s1" }));
    expect(res.status).toBe(401);
  });

  it("retorna 400 para ação inválida", async () => {
    const res = await POST(postReq({ action: "pausar", sessionId: "s1" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/session-control - iniciar", () => {
  it("cria as fases e inicia a sessão em PEQUENO_EXPEDIENTE", async () => {
    const res = await POST(postReq({ action: "start", sessionId: "s1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.sessionPhase.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.votingSession.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: expect.objectContaining({ status: "PEQUENO_EXPEDIENTE", currentPhase: "PEQUENO_EXPEDIENTE" }),
    });
    expect(prismaMock.attendance.createMany).toHaveBeenCalledWith({
      data: [{ sessionId: "s1", userId: "c2", isPresent: false }],
    });
    expect(logAuditMock).toHaveBeenCalledWith("SESSAO_INICIADA", expect.any(String), expect.anything());
  });

  it("reaproveita fases já existentes em vez de recriar", async () => {
    prismaMock.sessionPhase.findFirst
      .mockResolvedValueOnce({ id: "p-sched", endedAt: null })
      .mockResolvedValueOnce({ id: "p-peq" });
    const res = await POST(postReq({ action: "start", sessionId: "s1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.sessionPhase.create).not.toHaveBeenCalled();
    expect(prismaMock.sessionPhase.update).toHaveBeenCalledWith({
      where: { id: "p-sched" },
      data: { endedAt: expect.any(Date) },
    });
  });
});

describe("POST /api/admin/session-control - encerrar", () => {
  it("fecha a fase aberta, cria CLOSED e encerra a sessão", async () => {
    prismaMock.sessionPhase.findFirst
      .mockResolvedValueOnce({ id: "p-open" }) // fase aberta
      .mockResolvedValueOnce(null); // fase CLOSED inexistente
    const res = await POST(postReq({ action: "end", sessionId: "s1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.sessionPhase.update).toHaveBeenCalledWith({
      where: { id: "p-open" },
      data: { endedAt: expect.any(Date) },
    });
    expect(prismaMock.sessionPhase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ phase: "CLOSED" }),
    });
    expect(prismaMock.votingSession.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: expect.objectContaining({ status: "CLOSED", currentPhase: "CLOSED", isAttendanceOpen: false }),
    });
    expect(logAuditMock).toHaveBeenCalledWith("SESSAO_ENCERRADA", expect.any(String), expect.anything());
  });
});
