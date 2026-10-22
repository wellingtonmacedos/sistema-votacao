import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  fullName: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  role: z.enum(["ADMIN", "PRESIDENT", "COUNCILOR"]).optional(),
  party: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  partyLogoUrl: z.string().nullable().optional(),
});

export const updateUserSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  email: z.string().email("Email inválido").optional(),
  fullName: z.string().min(2, "Nome deve ter ao menos 2 caracteres").optional(),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres").optional(),
  role: z.enum(["ADMIN", "PRESIDENT", "COUNCILOR"]).optional(),
  isActive: z.boolean().optional(),
  party: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  partyLogoUrl: z.string().nullable().optional(),
});

export const createPhaseSchema = z.object({
  name: z.string().min(1, "Nome da fase é obrigatório").max(100),
  orderIndex: z.number().int().min(0).optional(),
  color: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Cor inválida").optional(),
  isActive: z.boolean().optional(),
  hasVoting: z.boolean().optional(),
});

export const updatePhaseSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  name: z.string().min(1).max(100).optional(),
  orderIndex: z.number().int().min(0).optional(),
  color: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Cor inválida").optional(),
  isActive: z.boolean().optional(),
  hasVoting: z.boolean().optional(),
});

export const createDocumentTypeSchema = z.object({
  label: z.string().trim().min(1, "Nome de exibição é obrigatório").max(100),
  value: z
    .string()
    .trim()
    .min(1, "Código do tipo é obrigatório")
    .max(60)
    .regex(/^[A-Z0-9_]+$/, "Use apenas letras maiúsculas, números e underscore"),
  orderIndex: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateDocumentTypeSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  label: z.string().trim().min(1, "Nome de exibição é obrigatório").max(100).optional(),
  value: z
    .string()
    .trim()
    .min(1, "Código do tipo é obrigatório")
    .max(60)
    .regex(/^[A-Z0-9_]+$/, "Use apenas letras maiúsculas, números e underscore")
    .optional(),
  orderIndex: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const voteSchema = z.object({
  type: z.enum(["matter", "document"]),
  itemId: z.string().min(1, "itemId é obrigatório"),
  voteType: z.enum(["YES", "NO", "ABSTENTION"]),
});

export const attendanceRegisterSchema = z.object({
  sessionId: z.string().min(1, "sessionId é obrigatório"),
});

export const sessionControlSchema = z.object({
  action: z.enum(["start", "end"]),
  sessionId: z.string().min(1, "sessionId é obrigatório"),
});

export const sessionScriptItemInputSchema = z.object({
  id: z.string().min(1, "ID inválido").optional(),
  sectionTitle: z
    .string()
    .trim()
    .max(200, "Título da seção deve ter no máximo 200 caracteres")
    .optional()
    .transform((value) => value || undefined),
  content: z.string().trim().min(1, "O item do roteiro é obrigatório").max(2000, "O item do roteiro deve ter no máximo 2000 caracteres"),
  orderIndex: z.number().int().min(0).optional(),
});

export const saveSessionScriptSchema = z.object({
  sessionId: z.string().min(1, "sessionId é obrigatório"),
  items: z.array(sessionScriptItemInputSchema).max(300, "Limite de 300 itens por roteiro"),
});

export const updateSessionScriptProgressSchema = z.object({
  itemId: z.string().min(1, "itemId é obrigatório"),
  isCompleted: z.boolean().optional(),
  presidentNotes: z.string().max(5000, "As notas devem ter no máximo 5000 caracteres").nullable().optional(),
});

export const createSpeechRequestSchema = z.object({
  subject: z.string().min(1, "Assunto é obrigatório").max(500),
  type: z.enum(["CONSIDERACOES_FINAIS", "TRIBUNA_LIVE"]).optional(),
  userId: z.string().nullable().optional(),
  citizenName: z.string().max(200).nullable().optional(),
  citizenProfession: z.string().max(200).nullable().optional(),
  sessionId: z.string().min(1).optional(),
});

export const setReadingDocumentSchema = z.object({
  documentId: z.string().nullable(),
  isReading: z.boolean(),
});

export const uploadPresignedSchema = z.object({
  fileName: z.string().min(1, "Nome do arquivo é obrigatório"),
  contentType: z.string().min(1, "Tipo de conteúdo é obrigatório"),
  category: z.enum(["image", "document"]).optional(),
});

export function parseBody<T>(schema: z.ZodType<T>, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message);
    throw new ValidationError(errors);
  }
  return result.data;
}

export class ValidationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(errors.join(", "));
    this.name = "ValidationError";
    this.errors = errors;
  }
}
