import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getServerSessionMock, logAuditMock } = vi.hoisted(() => ({
  prismaMock: { votingSession: { findUnique: vi.fn() } },
  getServerSessionMock: vi.fn(),
  logAuditMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/audit", () => ({ logAudit: logAuditMock }));

import { GET } from "@/app/api/reports/votes/route";

function req(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/reports/votes?${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSessionMock.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
  prismaMock.votingSession.findUnique.mockResolvedValue({ id: "s1", matters: [], documents: [] });
});

describe("GET /api/reports/votes", () => {
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

  it("retorna 404 quando a sessão não existe", async () => {
    prismaMock.votingSession.findUnique.mockResolvedValue(null);
    const res = await GET(req("sessionId=s1"));
    expect(res.status).toBe(404);
  });

  it("retorna os dados da sessão e registra auditoria", async () => {
    const res = await GET(req("sessionId=s1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "s1", matters: [], documents: [] });
    expect(logAuditMock).toHaveBeenCalledWith("VIEW_REPORT", expect.stringContaining("s1"), expect.anything());
  });
});
