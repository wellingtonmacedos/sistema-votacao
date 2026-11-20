import { describe, it, expect } from "vitest";
import {
  PHASE_STATUS_KEYS,
  normalizePhaseText,
  toPhaseStatusKey,
  getPhaseLabel,
} from "@/lib/phase-utils";

describe("normalizePhaseText", () => {
  it("remove acentos e normaliza caixa e espaços", () => {
    expect(normalizePhaseText("  Considerações Finais  ")).toBe("consideracoes finais");
  });
});

describe("toPhaseStatusKey", () => {
  it("aceita a chave do enum", () => {
    expect(toPhaseStatusKey("GRANDE_EXPEDIENTE")).toBe("GRANDE_EXPEDIENTE");
  });

  it("aceita o nome de exibição sem acento", () => {
    expect(toPhaseStatusKey("grande expediente")).toBe("GRANDE_EXPEDIENTE");
  });

  it("aceita o nome de exibição com acento e capitalizado", () => {
    expect(toPhaseStatusKey("Considerações Finais")).toBe("CONSIDERACOES_FINAIS");
  });

  it("mapeia sinônimos de encerramento para CLOSED", () => {
    expect(toPhaseStatusKey("encerrada")).toBe("CLOSED");
    expect(toPhaseStatusKey("Encerramento")).toBe("CLOSED");
  });

  it("retorna null para vazio, nulo ou valor desconhecido", () => {
    expect(toPhaseStatusKey("")).toBeNull();
    expect(toPhaseStatusKey(null)).toBeNull();
    expect(toPhaseStatusKey(undefined)).toBeNull();
    expect(toPhaseStatusKey("fase inexistente")).toBeNull();
  });
});

describe("getPhaseLabel", () => {
  it("retorna o rótulo de exibição da fase", () => {
    expect(getPhaseLabel("ORDEM_DO_DIA")).toBe("Ordem do Dia");
    expect(getPhaseLabel("TRIBUNA_LIVE")).toBe("Tribuna Livre");
  });

  it("retorna 'Aguardando' quando vazio", () => {
    expect(getPhaseLabel(null)).toBe("Aguardando");
    expect(getPhaseLabel("")).toBe("Aguardando");
  });

  it("devolve o próprio valor quando não reconhecido", () => {
    expect(getPhaseLabel("Fase personalizada")).toBe("Fase personalizada");
  });
});

describe("PHASE_STATUS_KEYS", () => {
  it("contém todas as fases esperadas", () => {
    expect(PHASE_STATUS_KEYS).toContain("SCHEDULED");
    expect(PHASE_STATUS_KEYS).toContain("CLOSED");
    expect(PHASE_STATUS_KEYS).toHaveLength(7);
  });
});
