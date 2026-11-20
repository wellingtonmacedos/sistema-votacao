// Validação das variáveis de ambiente críticas.
//
// É executada no boot do servidor (via `instrumentation.ts`) para falhar rápido
// em produção caso alguma variável obrigatória esteja ausente.
//
// Importante: NÃO colocar esta validação em módulos importados durante o build
// (como `lib/db.ts`), pois isso quebraria o passo de build do Next.js.

const REQUIRED_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
] as const

export function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}. ` +
        "Defina-as antes de iniciar o servidor (veja .env.example)."
    )
  }

  if ((process.env.NEXTAUTH_SECRET as string).length < 32) {
    console.warn(
      "[env] NEXTAUTH_SECRET tem menos de 32 caracteres. " +
        "Recomenda-se um segredo longo e aleatório em produção " +
        "(openssl rand -base64 32)."
    )
  }
}
