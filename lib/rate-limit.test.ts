import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, resetRateLimit, buildRateLimitKey } from "@/lib/rate-limit";

// Sem REDIS_URL definida, o limiter usa o fallback em memória — que é o caminho
// exercitado por estes testes (CI/desenvolvimento sem Redis).
describe("rateLimit (fallback em memória)", () => {
  beforeEach(async () => {
    await resetRateLimit("test@example.com:127.0.0.1");
    await resetRateLimit("test@example.com:unknown");
  });

  it("deve permitir a primeira tentativa", async () => {
    const result = await rateLimit("test@example.com:127.0.0.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfter).toBeNull();
  });

  it("deve permitir até 5 tentativas na janela", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await rateLimit("test@example.com:127.0.0.1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it("deve bloquear a 6ª tentativa", async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimit("test@example.com:127.0.0.1");
    }
    const result = await rateLimit("test@example.com:127.0.0.1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("deve resetar o contador quando chamado resetRateLimit", async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimit("test@example.com:127.0.0.1");
    }
    await resetRateLimit("test@example.com:127.0.0.1");
    const result = await rateLimit("test@example.com:127.0.0.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("deve manter contadores independentes por chave", async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimit("test@example.com:127.0.0.1");
    }
    const blocked = await rateLimit("test@example.com:127.0.0.1");
    expect(blocked.allowed).toBe(false);

    const otherIp = await rateLimit("test@example.com:192.168.1.1");
    expect(otherIp.allowed).toBe(true);
    expect(otherIp.remaining).toBe(4);
  });
});

describe("buildRateLimitKey", () => {
  it("deve combinar identificador e IP", () => {
    expect(buildRateLimitKey("user@test.com", "1.2.3.4")).toBe("user@test.com:1.2.3.4");
  });

  it("deve usar 'unknown' quando IP não fornecido", () => {
    expect(buildRateLimitKey("user@test.com")).toBe("user@test.com:unknown");
  });
});
