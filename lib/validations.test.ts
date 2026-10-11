import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  updateUserSchema,
  createPhaseSchema,
  updatePhaseSchema,
  voteSchema,
  attendanceRegisterSchema,
  sessionControlSchema,
  createSpeechRequestSchema,
  setReadingDocumentSchema,
  uploadPresignedSchema,
  parseBody,
  ValidationError,
} from "@/lib/validations";

describe("createUserSchema", () => {
  it("deve aceitar dados válidos", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      fullName: "Test User",
      password: "password123",
      role: "COUNCILOR",
    });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar email inválido", () => {
    const result = createUserSchema.safeParse({
      email: "not-an-email",
      fullName: "Test User",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("deve rejeitar nome muito curto", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      fullName: "A",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("deve rejeitar senha muito curta", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      fullName: "Test User",
      password: "123",
    });
    expect(result.success).toBe(false);
  });

  it("deve rejeitar role inválido", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      fullName: "Test User",
      password: "password123",
      role: "SUPERADMIN",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("deve exigir id", () => {
    const result = updateUserSchema.safeParse({ fullName: "Test" });
    expect(result.success).toBe(false);
  });

  it("deve aceitar atualização parcial", () => {
    const result = updateUserSchema.safeParse({ id: "123", fullName: "New Name" });
    expect(result.success).toBe(true);
  });
});

describe("createPhaseSchema", () => {
  it("deve aceitar fase válida", () => {
    const result = createPhaseSchema.safeParse({
      name: "Ordem do Dia",
      color: "#FF0000",
      hasVoting: true,
    });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar nome vazio", () => {
    const result = createPhaseSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("deve rejeitar cor inválida", () => {
    const result = createPhaseSchema.safeParse({ name: "Test", color: "red" });
    expect(result.success).toBe(false);
  });

  it("deve aceitar cor hex de 3 dígitos", () => {
    const result = createPhaseSchema.safeParse({ name: "Test", color: "#fff" });
    expect(result.success).toBe(true);
  });
});

describe("voteSchema", () => {
  it("deve aceitar voto válido", () => {
    const result = voteSchema.safeParse({
      type: "matter",
      itemId: "123",
      voteType: "YES",
    });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar tipo de votação inválido", () => {
    const result = voteSchema.safeParse({
      type: "invalid",
      itemId: "123",
      voteType: "YES",
    });
    expect(result.success).toBe(false);
  });

  it("deve rejeitar tipo de voto inválido", () => {
    const result = voteSchema.safeParse({
      type: "matter",
      itemId: "123",
      voteType: "MAYBE",
    });
    expect(result.success).toBe(false);
  });
});

describe("attendanceRegisterSchema", () => {
  it("deve exigir sessionId", () => {
    const result = attendanceRegisterSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("deve aceitar sessionId válido", () => {
    const result = attendanceRegisterSchema.safeParse({ sessionId: "sess-123" });
    expect(result.success).toBe(true);
  });
});

describe("sessionControlSchema", () => {
  it("deve aceitar action start", () => {
    const result = sessionControlSchema.safeParse({ action: "start", sessionId: "123" });
    expect(result.success).toBe(true);
  });

  it("deve aceitar action end", () => {
    const result = sessionControlSchema.safeParse({ action: "end", sessionId: "123" });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar action inválida", () => {
    const result = sessionControlSchema.safeParse({ action: "pause", sessionId: "123" });
    expect(result.success).toBe(false);
  });
});

describe("createSpeechRequestSchema", () => {
  it("deve exigir subject", () => {
    const result = createSpeechRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("deve aceitar subject válido", () => {
    const result = createSpeechRequestSchema.safeParse({ subject: "Sobre o orçamento" });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar subject muito longo", () => {
    const result = createSpeechRequestSchema.safeParse({ subject: "A".repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe("setReadingDocumentSchema", () => {
  it("deve aceitar documento nulo", () => {
    const result = setReadingDocumentSchema.safeParse({ documentId: null, isReading: false });
    expect(result.success).toBe(true);
  });

  it("deve exigir isReading", () => {
    const result = setReadingDocumentSchema.safeParse({ documentId: "123" });
    expect(result.success).toBe(false);
  });
});

describe("uploadPresignedSchema", () => {
  it("deve exigir fileName e contentType", () => {
    const result = uploadPresignedSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("deve aceitar dados válidos", () => {
    const result = uploadPresignedSchema.safeParse({
      fileName: "foto.jpg",
      contentType: "image/jpeg",
      category: "image",
    });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar categoria inválida", () => {
    const result = uploadPresignedSchema.safeParse({
      fileName: "foto.jpg",
      contentType: "image/jpeg",
      category: "video",
    });
    expect(result.success).toBe(false);
  });
});

describe("parseBody", () => {
  it("deve retornar dados validados", () => {
    const data = parseBody(createUserSchema, {
      email: "test@example.com",
      fullName: "Test User",
      password: "password123",
    });
    expect(data.email).toBe("test@example.com");
  });

  it("deve lançar ValidationError em dados inválidos", () => {
    expect(() =>
      parseBody(createUserSchema, { email: "invalid", fullName: "T", password: "123" })
    ).toThrow(ValidationError);
  });

  it("deve incluir mensagens de erro no ValidationError", () => {
    try {
      parseBody(createUserSchema, { email: "invalid", fullName: "T", password: "123" });
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).errors.length).toBeGreaterThan(0);
    }
  });
});
