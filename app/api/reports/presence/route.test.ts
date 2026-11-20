import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getServerSessionMock, logAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findMany: vi.fn() },
    attendance: { findMany: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
  logAuditMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/audit", () => ({ logAudit: logAuditMock }));

import { GET } from "@/app/api/reports/presence/route";

function req(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/reports/presence?${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSessionMock.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
  prismaMock.user.findMany.mockResolvedValue([
    { id: "c1", fullName: "Ana", party: "P1", photoUrl: null },
    { id: "c2", fullName: "Bruno", party: "P2", photoUrl: null },
  ]);
  prismaMock.attendance.findMany.mockResolvedValue([
    { userId: "c1", isPresent: true, arrivedAt: new Date("2026-03-01T18:00:00Z") },
  ]);
});

describe("GET /api/reports/presence", () => {
  it("retorna 403 sem sessão", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await GET(req("sessionId=s1"));
    expect(res.status).toBe(403);
  });

  it("retorna 403 para papel sem acesso (COUNCILOR)", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1", role: "COUNCILOR" } });
    const res = await GET(req("sessionId=s1"));
    expect(res.status).toBe(403);
  });

  it("retorna 400 sem sessionId", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });

  it("cruza vereadores com as presenças da sessão", async () => {
    const res = await GET(req("sessionId=s1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);
    expect(json[0]).toMatchObject({ id: "c1", fullName: "Ana", isPresent: true });
    expect(json[1]).toMatchObject({ id: "c2", fullName: "Bruno", isPresent: false });
    expect(json[1].arrivedAt).toBeUndefined();
    expect(logAuditMock).toHaveBeenCalledWith("VIEW_REPORT", expect.stringContaining("s1"), expect.anything());
  });
});
