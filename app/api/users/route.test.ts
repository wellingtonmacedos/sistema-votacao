import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock, getServerSessionMock, logAuditMock, bcryptHashMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  getServerSessionMock: vi.fn(),
  logAuditMock: vi.fn(),
  bcryptHashMock: vi.fn(async () => "$2a$10$hash"),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/audit", () => ({ logAudit: logAuditMock }));
vi.mock("bcryptjs", () => ({ default: { hash: bcryptHashMock } }));

import { GET, POST, PATCH, DELETE } from "@/app/api/users/route";

function req(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/users${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSessionMock.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
  prismaMock.user.findMany.mockResolvedValue([{ id: "u1", fullName: "Ana" }]);
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.findFirst.mockResolvedValue(null);
  prismaMock.user.count.mockResolvedValue(1);
  prismaMock.user.create.mockResolvedValue({ id: "new1", email: "x@y.com", fullName: "Novo", role: "COUNCILOR" });
  prismaMock.user.update.mockResolvedValue({ id: "u1", email: "ana@y.com", fullName: "Ana", role: "COUNCILOR" });
  prismaMock.user.delete.mockResolvedValue({});
});

describe("GET /api/users", () => {
  it("retorna 401 sem sessão", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await GET(req("GET", ""));
    expect(res.status).toBe(401);
  });

  it("retorna 403 para papel diferente de ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1", role: "PRESIDENT" } });
    const res = await GET(req("GET", ""));
    expect(res.status).toBe(403);
  });

  it("lista usuários, aplicando filtro por papel", async () => {
    const res = await GET(req("GET", "?role=COUNCILOR"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "u1", fullName: "Ana" }]);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: "COUNCILOR" } })
    );
  });
});

describe("POST /api/users", () => {
  const valid = { email: "novo@camara.gov.br", fullName: "Novo Vereador", password: "senha123", role: "COUNCILOR" };

  it("retorna 401 sem sessão", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await POST(req("POST", "", valid));
    expect(res.status).toBe(401);
  });

  it("retorna 403 para papel diferente de ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1", role: "COUNCILOR" } });
    const res = await POST(req("POST", "", valid));
    expect(res.status).toBe(403);
  });

  it("retorna 400 para corpo inválido", async () => {
    const res = await POST(req("POST", "", { email: "invalido", fullName: "x" }));
    expect(res.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o email já existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existente" });
    const res = await POST(req("POST", "", valid));
    expect(res.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("cria o usuário com a senha criptografada", async () => {
    const res = await POST(req("POST", "", valid));
    expect(res.status).toBe(200);
    expect(bcryptHashMock).toHaveBeenCalledWith("senha123", 10);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password: "$2a$10$hash", role: "COUNCILOR" }) })
    );
    expect(logAuditMock).toHaveBeenCalledWith("USUARIO_CRIADO", expect.any(String), expect.anything());
  });
});

describe("PATCH /api/users", () => {
  it("retorna 404 quando o usuário não existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await PATCH(req("PATCH", "", { id: "u9", fullName: "Nome" }));
    expect(res.status).toBe(404);
  });

  it("retorna 400 quando o email pertence a outro usuário", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", email: "old@y.com", fullName: "Ana", role: "COUNCILOR" });
    prismaMock.user.findFirst.mockResolvedValue({ id: "outro" });
    const res = await PATCH(req("PATCH", "", { id: "u1", email: "dup@y.com" }));
    expect(res.status).toBe(400);
  });

  it("atualiza e registra auditoria quando há mudanças", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", email: "old@y.com", fullName: "Ana", role: "COUNCILOR" });
    const res = await PATCH(req("PATCH", "", { id: "u1", email: "novo@y.com", password: "novaSenha1" }));
    expect(res.status).toBe(200);
    expect(bcryptHashMock).toHaveBeenCalledWith("novaSenha1", 10);
    expect(logAuditMock).toHaveBeenCalledWith("USUARIO_ATUALIZADO", expect.any(String), expect.anything());
  });

  it("não registra auditoria quando nada muda", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", email: "same@y.com", fullName: "Ana", role: "COUNCILOR" });
    const res = await PATCH(req("PATCH", "", { id: "u1", email: "same@y.com" }));
    expect(res.status).toBe(200);
    expect(logAuditMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/users", () => {
  it("retorna 400 sem id", async () => {
    const res = await DELETE(req("DELETE", ""));
    expect(res.status).toBe(400);
  });

  it("retorna 404 quando o usuário não existe", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await DELETE(req("DELETE", "?id=u9"));
    expect(res.status).toBe(404);
  });

  it("impede excluir a própria conta", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin1", role: "ADMIN", fullName: "Eu", email: "eu@y.com" });
    const res = await DELETE(req("DELETE", "?id=admin1"));
    expect(res.status).toBe(400);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("impede excluir o último administrador ativo", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "a2", role: "ADMIN", fullName: "Outro", email: "o@y.com" });
    prismaMock.user.count.mockResolvedValue(0);
    const res = await DELETE(req("DELETE", "?id=a2"));
    expect(res.status).toBe(400);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("exclui o usuário e registra auditoria", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", role: "COUNCILOR", fullName: "Ana", email: "ana@y.com" });
    const res = await DELETE(req("DELETE", "?id=u1"));
    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(logAuditMock).toHaveBeenCalledWith("USUARIO_EXCLUIDO", expect.any(String), expect.anything());
  });
});
