import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getServerSessionMock } = vi.hoisted(() => ({
  prismaMock: {
    votingSession: { findUnique: vi.fn() },
    attendance: { upsert: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));

import { POST } from "@/app/api/attendance/register/route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/attendance/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSessionMock.mockResolvedValue({ user: { id: "u1", role: "COUNCILOR" } });
  prismaMock.votingSession.findUnique.mockResolvedValue({ id: "s1", isAttendanceOpen: true });
  prismaMock.attendance.upsert.mockResolvedValue({});
});

describe("POST /api/attendance/register", () => {
  it("retorna 403 sem sessão autenticada", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await POST(postReq({ sessionId: "s1" }));
    expect(res.status).toBe(403);
  });

  it("retorna 403 para papel que não registra presença (ADMIN)", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const res = await POST(postReq({ sessionId: "s1" }));
    expect(res.status).toBe(403);
  });

  it("retorna 400 sem sessionId", async () => {
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
  });

  it("retorna 404 quando a sessão não existe", async () => {
    prismaMock.votingSession.findUnique.mockResolvedValue(null);
    const res = await POST(postReq({ sessionId: "s1" }));
    expect(res.status).toBe(404);
  });

  it("retorna 400 quando a chamada de presença está fechada", async () => {
    prismaMock.votingSession.findUnique.mockResolvedValue({ id: "s1", isAttendanceOpen: false });
    const res = await POST(postReq({ sessionId: "s1" }));
    expect(res.status).toBe(400);
  });

  it("registra a presença com sucesso (200)", async () => {
    const res = await POST(postReq({ sessionId: "s1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.attendance.upsert).toHaveBeenCalledOnce();
    const arg = prismaMock.attendance.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ sessionId_userId: { sessionId: "s1", userId: "u1" } });
    expect(arg.create).toMatchObject({ sessionId: "s1", userId: "u1", isPresent: true });
    expect(arg.update).toMatchObject({ isPresent: true, absenceJustification: null });
  });
});
