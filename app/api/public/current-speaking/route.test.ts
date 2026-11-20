import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { speechRequest: { findFirst: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/public/current-speaking/route";

function req(): NextRequest {
  return new NextRequest("http://localhost/api/public/current-speaking");
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.speechRequest.findFirst.mockResolvedValue(null);
});

describe("GET /api/public/current-speaking", () => {
  it("retorna null quando ninguém está falando", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("retorna o orador atual com seus processos", async () => {
    prismaMock.speechRequest.findFirst.mockResolvedValue({
      id: "sr1",
      isSpeaking: true,
      user: { id: "u1", fullName: "Ana" },
      session: { id: "s1", title: "Sessão", status: "ORDEM_DO_DIA" },
      legislativeProcesses: [{ id: "lp1" }],
    });
    const json = await (await GET(req())).json();
    expect(json).toMatchObject({ id: "sr1", user: { fullName: "Ana" } });
    expect(json.legislativeProcesses).toHaveLength(1);
    expect(prismaMock.speechRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isSpeaking: true } })
    );
  });
});
