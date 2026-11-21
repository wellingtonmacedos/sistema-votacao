import { defineConfig } from "vitest/config";

// Testes de integração: exercitam os route handlers com um PostgreSQL REAL
// (sem mocks do Prisma). Apenas a sessão do NextAuth é simulada.
//
// Requerem a variável TEST_DATABASE_URL apontando para um banco de teste
// DESCARTÁVEL (as tabelas são truncadas entre os casos). Não aponte para o
// banco de desenvolvimento. Veja docs/banco-de-dados.md.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    // Um único banco é compartilhado entre os casos: não rodar arquivos em paralelo.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
