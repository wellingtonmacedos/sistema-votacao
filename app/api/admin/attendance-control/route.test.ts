import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getServerSessionMock } = vi.hoisted(() => ({
  prismaMock: {
    votingSession: { update: vi.fn() },
    attendance: { count: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));

import { POST } from "@/app/api/admin/attendance-control/route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/attendance-control", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSessionMock.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
  prismaMock.votingSession.update.mockResolvedValue({ id: "s1", quorum: 5 });
  prismaMock.attendance.count.mockResolvedValue(0);
});

describe("POST /api/admin/attendance-control", () => {
  it("retorna 401 sem sessão", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await POST(postReq({ action: "start", sessionId: "s1" }));
    expect(res.status).toBe(401);
  });

  it("retorna 401 para papel diferente de ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1", role: "COUNCILOR" } });
    const res = await POST(postReq({ action: "start", sessionId: "s1" }));
    expect(res.status).toBe(401);
  });

  it("retorna 400 para ação inválida", async () => {
    const res = await POST(postReq({ action: "abrir", sessionId: "s1" }));
    expect(res.status).toBe(400);
  });

  it("abre a chamada de presença", async () => {
    const res = await POST(postReq({ action: "start", sessionId: "s1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.votingSession.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: expect.objectContaining({ isAttendanceOpen: true, attendanceEndedAt: null }),
    });
  });

  it("encerra a chamada com quórum atingido", async () => {
    prismaMock.attendance.count.mockResolvedValue(6);
    const res = await POST(postReq({ action: "end", sessionId: "s1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.presentCount).toBe(6);
    expect(json.hasQuorum).toBe(true);
  });

  it("encerra a chamada sem quórum", async () => {
    prismaMock.attendance.count.mockResolvedValue(3);
    const res = await POST(postReq({ action: "end", sessionId: "s1" }));
    const json = await res.json();
    expect(json.presentCount).toBe(3);
    expect(json.hasQuorum).toBe(false);
  });
});
