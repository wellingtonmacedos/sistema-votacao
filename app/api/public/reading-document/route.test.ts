import { describe, it, expect, beforeEach, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    votingSession: { findFirst: vi.fn() },
    document: { findFirst: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/public/reading-document/route";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.votingSession.findFirst.mockResolvedValue({ id: "s1" });
  prismaMock.document.findFirst.mockResolvedValue(null);
  prismaMock.user.findMany.mockResolvedValue([]);
});

describe("GET /api/public/reading-document", () => {
  it("retorna document null sem sessão ativa", async () => {
    prismaMock.votingSession.findFirst.mockResolvedValue(null);
    const json = await (await GET()).json();
    expect(json).toEqual({ document: null });
  });

  it("retorna document null quando nada está em leitura", async () => {
    const json = await (await GET()).json();
    expect(json).toEqual({ document: null });
  });

  it("não usa o administrador como proponente quando não há autor", async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: "d1",
      author: null,
      creator: { fullName: "Administrador do Sistema", photoUrl: "/a.png", role: "ADMIN" },
    });
    const json = await (await GET()).json();
    expect(json.document.proponent).toBeNull();
  });

  it("usa o criador como proponente quando não há autor e o criador é vereador/presidente", async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: "d1",
      author: null,
      creator: { fullName: "Criador", photoUrl: "/c.png", role: "COUNCILOR" },
    });
    const json = await (await GET()).json();
    expect(json.document.proponent).toEqual({ fullName: "Criador", photoUrl: "/c.png" });
  });

  it("resolve o proponente pelo primeiro autor reconhecido", async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: "d1",
      author: "Ana, Bruno",
      creator: { fullName: "Criador", photoUrl: "/c.png", role: "ADMIN" },
    });
    prismaMock.user.findMany.mockResolvedValue([{ fullName: "Bruno", nickname: null, photoUrl: "/bruno.png" }]);
    const json = await (await GET()).json();
    expect(json.document.proponent).toEqual({ fullName: "Ana, Bruno", nickname: null, photoUrl: "/bruno.png" });
  });

  it("usa o apelido do autor quando reconhecido", async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: "d1",
      author: "Bruno",
      creator: { fullName: "Criador", photoUrl: "/c.png", role: "ADMIN" },
    });
    prismaMock.user.findMany.mockResolvedValue([{ fullName: "Bruno", nickname: "Bruninho", photoUrl: "/bruno.png" }]);
    const json = await (await GET()).json();
    expect(json.document.proponent).toEqual({ fullName: "Bruno", nickname: "Bruninho", photoUrl: "/bruno.png" });
  });

  it("mantém o proponente sem foto quando nenhum autor é encontrado", async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: "d1",
      author: "Desconhecido",
      creator: { fullName: "Criador", photoUrl: "/c.png", role: "ADMIN" },
    });
    const json = await (await GET()).json();
    expect(json.document.proponent).toEqual({ fullName: "Desconhecido", nickname: null, photoUrl: null });
  });

  it("envia cabeçalhos de no-cache", async () => {
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});
