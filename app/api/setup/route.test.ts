import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn(async () => {}) }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(async () => "$2a$12$hash") },
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 4, retryAfter: null })),
  buildRateLimitKey: (id: string, ip?: string) => `${id}:${ip ?? "unknown"}`,
}));

import { GET, POST } from "@/app/api/setup/route";
import { rateLimit } from "@/lib/rate-limit";

const rateLimitMock = rateLimit as unknown as ReturnType<typeof vi.fn>;

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/setup", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  token: "token-secreto",
  email: "Admin@Camara.gov.br",
  fullName: "Administrador Inicial",
  password: "Senha1234",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SETUP_TOKEN", "token-secreto");
  rateLimitMock.mockResolvedValue({ allowed: true, remaining: 4, retryAfter: null });
  prismaMock.user.count.mockResolvedValue(0);
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.create.mockResolvedValue({
    id: "u1",
    email: "admin@camara.gov.br",
    fullName: "Administrador Inicial",
  });
  prismaMock.auditLog.create.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/setup", () => {
  it("informa setupRequired quando não há admin ativo", async () => {
    prismaMock.user.count.mockResolvedValue(0);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ setupRequired: true, setupEnabled: true });
  });

  it("informa setupRequired=false quando já existe admin ativo", async () => {
    prismaMock.user.count.mockResolvedValue(1);
    const res = await GET();
    expect(await res.json()).toEqual({ setupRequired: false, setupEnabled: true });
  });

  it("setupEnabled=false quando SETUP_TOKEN não está definido", async () => {
    vi.stubEnv("SETUP_TOKEN", "");
    const res = await GET();
    expect((await res.json()).setupEnabled).toBe(false);
  });
});

describe("POST /api/setup", () => {
  it("retorna 429 quando excede o rate limit", async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, remaining: 0, retryAfter: 42 });
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("retorna 503 quando SETUP_TOKEN não está definido", async () => {
    vi.stubEnv("SETUP_TOKEN", "");
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(503);
  });

  it("retorna 409 quando já existe admin ativo", async () => {
    prismaMock.user.count.mockResolvedValue(1);
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(409);
  });

  it("retorna 403 quando o token é inválido", async () => {
    const res = await POST(postReq({ ...validBody, token: "errado" }));
    expect(res.status).toBe(403);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o email já está cadastrado", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existente" });
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o corpo é inválido (senha fraca)", async () => {
    const res = await POST(postReq({ ...validBody, password: "curta" }));
    expect(res.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("cria o admin com papel ADMIN e normaliza o email", async () => {
    const res = await POST(postReq(validBody));
    expect(res.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
    const arg = prismaMock.user.create.mock.calls[0][0];
    expect(arg.data.email).toBe("admin@camara.gov.br");
    expect(arg.data.role).toBe("ADMIN");
    expect(arg.data.isActive).toBe(true);
    expect(arg.data.mustChangePassword).toBe(false);
    expect(arg.data.password).toBe("$2a$12$hash");
  });
});
