import { describe, it, expect, afterEach, vi } from "vitest";

// lib/setup.ts importa lib/db (que exige DATABASE_URL no import). Mockamos o
// Prisma para exercitar apenas as funções puras de forma isolada.
vi.mock("@/lib/db", () => ({
  prisma: { user: { count: vi.fn() } },
}));

import { isSetupEnabled, verifySetupToken } from "@/lib/setup";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isSetupEnabled", () => {
  it("retorna false quando SETUP_TOKEN não está definido", () => {
    vi.stubEnv("SETUP_TOKEN", "");
    expect(isSetupEnabled()).toBe(false);
  });

  it("retorna true quando SETUP_TOKEN está definido", () => {
    vi.stubEnv("SETUP_TOKEN", "segredo-aleatorio");
    expect(isSetupEnabled()).toBe(true);
  });
});

describe("verifySetupToken", () => {
  it("retorna false quando SETUP_TOKEN não está definido", () => {
    vi.stubEnv("SETUP_TOKEN", "");
    expect(verifySetupToken("qualquer")).toBe(false);
  });

  it("retorna false para entrada não textual", () => {
    vi.stubEnv("SETUP_TOKEN", "segredo-aleatorio");
    expect(verifySetupToken(undefined)).toBe(false);
    expect(verifySetupToken(123)).toBe(false);
    expect(verifySetupToken(null)).toBe(false);
  });

  it("retorna true para o token correto", () => {
    vi.stubEnv("SETUP_TOKEN", "segredo-aleatorio");
    expect(verifySetupToken("segredo-aleatorio")).toBe(true);
  });

  it("retorna false para o token incorreto", () => {
    vi.stubEnv("SETUP_TOKEN", "segredo-aleatorio");
    expect(verifySetupToken("outro-valor")).toBe(false);
    expect(verifySetupToken("segredo-aleatori")).toBe(false);
  });
});
