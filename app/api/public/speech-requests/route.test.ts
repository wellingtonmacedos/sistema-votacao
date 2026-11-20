import { describe, it, expect, beforeEach, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    votingSession: { findFirst: vi.fn() },
    speechRequest: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/public/speech-requests/route";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.votingSession.findFirst.mockResolvedValue({ id: "s1", isSpeechRequestsOpen: true });
  prismaMock.speechRequest.findMany.mockResolvedValue([]);
});

describe("GET /api/public/speech-requests", () => {
  it("retorna lista vazia sem sessão ativa", async () => {
    prismaMock.votingSession.findFirst.mockResolvedValue(null);
    const json = await (await GET()).json();
    expect(json).toEqual({ speechRequests: [], isSpeechRequestsOpen: false });
    expect(prismaMock.speechRequest.findMany).not.toHaveBeenCalled();
  });

  it("formata o nome do vereador e separa por tipo", async () => {
    prismaMock.speechRequest.findMany.mockResolvedValue([
      {
        id: "sr1",
        type: "CONSIDERACOES_FINAIS",
        subject: "Tema A",
        isSpeaking: true,
        hasSpoken: false,
        timeLimit: 300,
        startedAt: new Date("2026-03-01T20:00:00Z"),
        endedAt: null,
        orderIndex: 1,
        citizenName: null,
        citizenProfession: null,
        user: { fullName: "Ana", photoUrl: "/a.png", party: "P1", partyLogoUrl: "/p1.png" },
      },
      {
        id: "sr2",
        type: "TRIBUNA_LIVE",
        subject: "Tema B",
        isSpeaking: false,
        hasSpoken: true,
        timeLimit: null,
        startedAt: null,
        endedAt: new Date("2026-03-01T20:10:00Z"),
        orderIndex: 2,
        citizenName: "Cidadão",
        citizenProfession: "Advogado",
        user: null,
      },
    ]);
    const json = await (await GET()).json();
    expect(json.speechRequests).toHaveLength(2);
    expect(json.consideracoesFinais).toHaveLength(1);
    expect(json.tribunaLivre).toHaveLength(1);

    const vereador = json.consideracoesFinais[0];
    expect(vereador).toMatchObject({ name: "Ana", party: "P1", type: "CONSIDERACOES_FINAIS", orderIndex: 1 });
    expect(vereador.startedAt).toBe("2026-03-01T20:00:00.000Z");
    expect(vereador.endedAt).toBeUndefined();

    const cidadao = json.tribunaLivre[0];
    expect(cidadao).toMatchObject({ name: "Cidadão", party: "Vereador", profession: "Advogado" });
    expect(json.isSpeechRequestsOpen).toBe(true);
  });
});
