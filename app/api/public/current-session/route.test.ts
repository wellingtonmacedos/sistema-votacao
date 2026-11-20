import { describe, it, expect, beforeEach, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    votingSession: { findFirst: vi.fn() },
    matter: { findFirst: vi.fn() },
    document: { findFirst: vi.fn() },
    attendance: { count: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/public/current-session/route";

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    title: "Sessão Ordinária",
    sessionNumber: "12",
    date: new Date("2026-03-01T19:00:00Z"),
    status: "PEQUENO_EXPEDIENTE",
    currentPhase: "PEQUENO_EXPEDIENTE",
    isAttendanceOpen: true,
    isSpeechRequestsOpen: false,
    documents: [],
    timerStartedAt: null,
    timerDuration: null,
    timerPhase: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.votingSession.findFirst.mockResolvedValue(baseSession());
  prismaMock.matter.findFirst.mockResolvedValue(null);
  prismaMock.document.findFirst.mockResolvedValue(null);
  prismaMock.attendance.count.mockResolvedValue(0);
  prismaMock.user.findMany.mockResolvedValue([]);
});

describe("GET /api/public/current-session", () => {
  it("retorna null quando não há sessão ativa", async () => {
    prismaMock.votingSession.findFirst.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("expõe os dados básicos da sessão", async () => {
    const res = await GET();
    const json = await res.json();
    expect(json).toMatchObject({ id: "s1", sessionNumber: "12", currentPhase: "PEQUENO_EXPEDIENTE" });
    expect(json.currentVoting).toBeNull();
    expect(json.timer).toBeNull();
  });

  it("inclui o documento em leitura", async () => {
    prismaMock.votingSession.findFirst.mockResolvedValue(
      baseSession({ documents: [{ id: "d1", title: "Projeto", type: "PROJETO", content: "x", author: "Ana" }] })
    );
    const json = await (await GET()).json();
    expect(json.currentDocument).toEqual({ id: "d1", title: "Projeto", type: "PROJETO", content: "x", author: "Ana" });
  });

  it("monta a votação de matéria com a contagem de votos", async () => {
    prismaMock.matter.findFirst.mockResolvedValue({
      id: "m1",
      title: "Matéria",
      description: "desc",
      status: "VOTING",
      creator: { fullName: "Autor", photoUrl: "/a.png" },
      votes: [{ voteType: "YES" }, { voteType: "YES" }, { voteType: "NO" }, { voteType: "ABSTENTION" }],
    });
    prismaMock.attendance.count.mockResolvedValue(7);
    const json = await (await GET()).json();
    expect(json.currentVoting).toMatchObject({
      type: "matter",
      id: "m1",
      votes: { yes: 2, no: 1, abstention: 1 },
      totalVoters: 7,
      proponent: { fullName: "Autor", photoUrl: "/a.png" },
      isActive: true,
    });
  });

  it("monta a votação de documento resolvendo o proponente pela autoria", async () => {
    prismaMock.matter.findFirst.mockResolvedValue(null);
    prismaMock.document.findFirst.mockResolvedValue({
      id: "d1",
      title: "Indicação",
      description: null,
      type: "INDICACAO",
      author: "Ana, Bruno",
      creator: { fullName: "Criador", photoUrl: "/c.png" },
      votes: [{ voteType: "YES" }],
    });
    prismaMock.user.findMany.mockResolvedValue([{ fullName: "Bruno", photoUrl: "/bruno.png" }]);
    const json = await (await GET()).json();
    expect(json.currentVoting).toMatchObject({
      type: "document",
      id: "d1",
      description: "",
      author: "Ana, Bruno",
      proponent: { fullName: "Ana, Bruno", photoUrl: "/bruno.png" },
      votes: { yes: 1, no: 0, abstention: 0 },
    });
  });

  it("usa o criador como proponente quando não há autor", async () => {
    prismaMock.document.findFirst.mockResolvedValue({
      id: "d1",
      title: "Indicação",
      description: "d",
      type: "INDICACAO",
      author: null,
      creator: { fullName: "Criador", photoUrl: "/c.png" },
      votes: [],
    });
    const json = await (await GET()).json();
    expect(json.currentVoting.proponent).toEqual({ fullName: "Criador", photoUrl: "/c.png" });
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it("calcula o tempo restante do cronômetro", async () => {
    const startedAt = new Date(Date.now() - 30_000);
    prismaMock.votingSession.findFirst.mockResolvedValue(
      baseSession({ timerStartedAt: startedAt, timerDuration: 60, timerPhase: "VOTACAO" })
    );
    const json = await (await GET()).json();
    expect(json.timer.isActive).toBe(true);
    expect(json.timer.phase).toBe("VOTACAO");
    expect(json.timer.timeRemaining).toBeGreaterThan(25);
    expect(json.timer.timeRemaining).toBeLessThanOrEqual(30);
  });

  it("omite o cronômetro quando o tempo já esgotou", async () => {
    prismaMock.votingSession.findFirst.mockResolvedValue(
      baseSession({ timerStartedAt: new Date(Date.now() - 120_000), timerDuration: 60, timerPhase: "VOTACAO" })
    );
    const json = await (await GET()).json();
    expect(json.timer).toBeNull();
  });
});
