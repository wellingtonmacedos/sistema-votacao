import { describe, it, expect } from "vitest";
import { cn, formatDuration } from "@/lib/utils";

describe("formatDuration", () => {
  it("formata zero", () => {
    expect(formatDuration(0)).toBe("00:00:00");
  });

  it("formata apenas segundos", () => {
    expect(formatDuration(59)).toBe("00:00:59");
  });

  it("formata minuto exato", () => {
    expect(formatDuration(60)).toBe("00:01:00");
  });

  it("formata hora exata", () => {
    expect(formatDuration(3600)).toBe("01:00:00");
  });

  it("formata horas, minutos e segundos", () => {
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("não quebra acima de 24 horas", () => {
    expect(formatDuration(90061)).toBe("25:01:01");
  });
});

describe("cn", () => {
  it("combina classes", () => {
    expect(cn("px-2", "font-bold")).toBe("px-2 font-bold");
  });

  it("resolve conflitos do Tailwind mantendo a última", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignora valores falsy", () => {
    expect(cn("text-sm", false, undefined, null, "font-bold")).toBe("text-sm font-bold");
  });
});
