import { describe, it, expect, afterEach, vi } from "vitest";
import { validateEnv } from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("validateEnv", () => {
  it("não lança quando todas as variáveis obrigatórias estão definidas", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("NEXTAUTH_SECRET", "a".repeat(32));
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");

    expect(() => validateEnv()).not.toThrow();
  });

  it("lança quando DATABASE_URL está ausente", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("NEXTAUTH_SECRET", "a".repeat(32));
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");

    expect(() => validateEnv()).toThrow(/DATABASE_URL/);
  });

  it("lista todas as variáveis ausentes na mensagem", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("NEXTAUTH_SECRET", undefined);
    vi.stubEnv("NEXTAUTH_URL", undefined);

    expect(() => validateEnv()).toThrow(/DATABASE_URL.*NEXTAUTH_SECRET.*NEXTAUTH_URL/);
  });

  it("apenas emite aviso quando NEXTAUTH_SECRET é curto", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("NEXTAUTH_SECRET", "curto");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");

    expect(() => validateEnv()).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
  });
});
