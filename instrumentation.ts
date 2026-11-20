// Hook de boot do servidor Next.js.
//
// Roda uma única vez quando o servidor inicia (não durante o build), o que o
// torna o lugar correto para falhar rápido caso falte variável de ambiente
// obrigatória — sem quebrar a etapa de build.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/env")
    validateEnv()
  }
}
