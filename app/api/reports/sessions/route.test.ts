import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getServerSessionMock, logAuditMock } = vi.hoisted(() => ({
  prismaMock: { votingSession: { findMany: vi.fn() } },
  getServerSessionMock: vi.fn(),
  logAuditMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/audit", () => ({ logAudit: logAuditMock }));

import { GET } from "@/app/api/reports/sessions/route";

function req(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/reports/sessions?${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSessionMock.mockResolvedValue({ user: { id: "a1", role: "PRESIDENT" } });
  prismaMock.votingSession.findMany.mockResolvedValue([{ id: "s1" }]);
});

describe("GET /api/reports/sessions", () => {
  it("retorna 403 sem sessão", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await GET(req("month=3&year=2026"));
    expect(res.status).toBe(403);
  });

  it("retorna 403 para papel sem acesso (COUNCILOR)", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1", role: "COUNCILOR" } });
    const res = await GET(req("month=3&year=2026"));
    expect(res.status).toBe(403);
  });

  it("retorna 400 sem mês ou ano", async () => {
    const res = await GET(req("month=3"));
    expect(res.status).toBe(400);
  });

  it("consulta o intervalo do mês informado", async () => {
    const res = await GET(req("month=3&year=2026"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "s1" }]);
    const arg = prismaMock.votingSession.findMany.mock.calls[0][0];
    expect(arg.where.date.gte).toEqual(new Date(2026, 2, 1));
    expect(arg.where.date.lte).toEqual(new Date(2026, 3, 0, 23, 59, 59));
    expect(logAuditMock).toHaveBeenCalledWith("VIEW_REPORT", expect.stringContaining("3/2026"), expect.anything());
  });
});
