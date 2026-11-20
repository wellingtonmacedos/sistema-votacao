import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getServerSessionMock } = vi.hoisted(() => ({
  prismaMock: {
    votingSession: { findFirst: vi.fn(), findUnique: vi.fn() },
    attendance: { findUnique: vi.fn(), upsert: vi.fn() },
    matter: { findUnique: vi.fn() },
    vote: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    document: { findUnique: vi.fn() },
    documentVote: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  },
  getServerSessionMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));

import { POST, GET } from "@/app/api/vote/route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/vote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getReq(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/vote?${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSessionMock.mockResolvedValue({ user: { id: "u1", role: "COUNCILOR" } });
  prismaMock.votingSession.findFirst.mockResolvedValue({ id: "s1", status: "IN_PROGRESS" });
  prismaMock.attendance.findUnique.mockResolvedValue({ isPresent: true });
  prismaMock.vote.findUnique.mockResolvedValue(null);
  prismaMock.vote.create.mockResolvedValue({ id: "v1", voteType: "YES" });
  prismaMock.documentVote.findUnique.mockResolvedValue(null);
  prismaMock.documentVote.create.mockResolvedValue({ id: "dv1", voteType: "YES" });
});

describe("POST /api/vote - autorização", () => {
  it("retorna 401 sem sessão", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await POST(postReq({ type: "matter", itemId: "m1", voteType: "YES" }));
    expect(res.status).toBe(401);
  });

  it("retorna 403 para papel que não vota (ADMIN)", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    const res = await POST(postReq({ type: "matter", itemId: "m1", voteType: "YES" }));
    expect(res.status).toBe(403);
  });

  it("retorna 400 para tipo de voto inválido", async () => {
    const res = await POST(postReq({ type: "matter", itemId: "m1", voteType: "TALVEZ" }));
    expect(res.status).toBe(400);
  });

  it("retorna 404 quando não há sessão ativa", async () => {
    prismaMock.votingSession.findFirst.mockResolvedValue(null);
    const res = await POST(postReq({ type: "matter", itemId: "m1", voteType: "YES" }));
    expect(res.status).toBe(404);
  });

  it("retorna 403 quando a presença não foi registrada", async () => {
    prismaMock.attendance.findUnique.mockResolvedValue(null);
    const res = await POST(postReq({ type: "matter", itemId: "m1", voteType: "YES" }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/vote - matéria", () => {
  const body = { type: "matter", itemId: "m1", voteType: "YES" };

  it("retorna 404 quando a matéria não existe", async () => {
    prismaMock.matter.findUnique.mockResolvedValue(null);
    const res = await POST(postReq(body));
    expect(res.status).toBe(404);
  });

  it("retorna 400 quando a matéria não pertence à sessão ativa", async () => {
    prismaMock.matter.findUnique.mockResolvedValue({ status: "VOTING", sessions: [] });
    const res = await POST(postReq(body));
    expect(res.status).toBe(400);
  });

  it("retorna 400 quando a matéria não está em votação", async () => {
    prismaMock.matter.findUnique.mockResolvedValue({ status: "DRAFT", sessions: [{ sessionId: "s1" }] });
    const res = await POST(postReq(body));
    expect(res.status).toBe(400);
  });

  it("retorna 400 quando o voto já foi registrado", async () => {
    prismaMock.matter.findUnique.mockResolvedValue({ status: "VOTING", sessions: [{ sessionId: "s1" }] });
    prismaMock.vote.findUnique.mockResolvedValue({ id: "v0" });
    const res = await POST(postReq(body));
    expect(res.status).toBe(400);
    expect(prismaMock.vote.create).not.toHaveBeenCalled();
  });

  it("registra o voto com sucesso (200)", async () => {
    prismaMock.matter.findUnique.mockResolvedValue({ status: "VOTING", sessions: [{ sessionId: "s1" }] });
    const res = await POST(postReq(body));
    expect(res.status).toBe(200);
    expect(prismaMock.vote.create).toHaveBeenCalledWith({
      data: { matterId: "m1", userId: "u1", voteType: "YES" },
    });
  });
});

describe("POST /api/vote - documento", () => {
  const body = { type: "document", itemId: "d1", voteType: "NO" };

  it("retorna 404 quando o documento não existe", async () => {
    prismaMock.document.findUnique.mockResolvedValue(null);
    const res = await POST(postReq(body));
    expect(res.status).toBe(404);
  });

  it("retorna 400 quando o documento é de outra sessão", async () => {
    prismaMock.document.findUnique.mockResolvedValue({ id: "d1", sessionId: "outra", isVoting: true, isApproved: null });
    const res = await POST(postReq(body));
    expect(res.status).toBe(400);
  });

  it("retorna 400 quando o documento não está em votação", async () => {
    prismaMock.document.findUnique.mockResolvedValue({ id: "d1", sessionId: "s1", isVoting: false, isApproved: null });
    const res = await POST(postReq(body));
    expect(res.status).toBe(400);
  });

  it("retorna 400 quando a votação do documento já foi finalizada", async () => {
    prismaMock.document.findUnique.mockResolvedValue({ id: "d1", sessionId: "s1", isVoting: true, isApproved: true });
    const res = await POST(postReq(body));
    expect(res.status).toBe(400);
  });

  it("retorna 400 quando o voto já foi registrado", async () => {
    prismaMock.document.findUnique.mockResolvedValue({ id: "d1", sessionId: "s1", isVoting: true, isApproved: null });
    prismaMock.documentVote.findUnique.mockResolvedValue({ id: "dv0" });
    const res = await POST(postReq(body));
    expect(res.status).toBe(400);
    expect(prismaMock.documentVote.create).not.toHaveBeenCalled();
  });

  it("registra o voto com sucesso (200)", async () => {
    prismaMock.document.findUnique.mockResolvedValue({ id: "d1", sessionId: "s1", isVoting: true, isApproved: null });
    const res = await POST(postReq(body));
    expect(res.status).toBe(200);
    expect(prismaMock.documentVote.create).toHaveBeenCalledWith({
      data: { documentId: "d1", userId: "u1", voteType: "NO" },
    });
  });
});

describe("GET /api/vote", () => {
  it("retorna 400 sem type ou itemId", async () => {
    const res = await GET(getReq("type=matter"));
    expect(res.status).toBe(400);
  });

  it("retorna 400 para type desconhecido", async () => {
    const res = await GET(getReq("type=xyz&itemId=m1"));
    expect(res.status).toBe(400);
  });

  it("retorna os votos de uma matéria", async () => {
    prismaMock.vote.findMany.mockResolvedValue([{ id: "v1" }]);
    const res = await GET(getReq("type=matter&itemId=m1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ votes: [{ id: "v1" }] });
    expect(prismaMock.vote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { matterId: "m1" } })
    );
  });

  it("retorna os votos de um documento", async () => {
    prismaMock.documentVote.findMany.mockResolvedValue([{ id: "dv1" }]);
    const res = await GET(getReq("type=document&itemId=d1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ votes: [{ id: "dv1" }] });
    expect(prismaMock.documentVote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { documentId: "d1" } })
    );
  });
});
