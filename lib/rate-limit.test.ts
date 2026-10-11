import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, resetRateLimit, buildRateLimitKey } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimit("test@example.com:127.0.0.1");
    resetRateLimit("test@example.com:unknown");
  });

  it("deve permitir a primeira tentativa", () => {
    const result = rateLimit("test@example.com:127.0.0.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfter).toBeNull();
  });

  it("deve permitir até 5 tentativas na janela", () => {
    for (let i = 0; i < 5; i++) {
      const result = rateLimit("test@example.com:127.0.0.1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it("deve bloquear a 6ª tentativa", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test@example.com:127.0.0.1");
    }
    const result = rateLimit("test@example.com:127.0.0.1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("deve resetar o contador quando chamado resetRateLimit", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test@example.com:127.0.0.1");
    }
    resetRateLimit("test@example.com:127.0.0.1");
    const result = rateLimit("test@example.com:127.0.0.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("deve manter contadores independentes por chave", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("test@example.com:127.0.0.1");
    }
    const blocked = rateLimit("test@example.com:127.0.0.1");
    expect(blocked.allowed).toBe(false);

    const otherIp = rateLimit("test@example.com:192.168.1.1");
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
