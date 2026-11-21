import { execSync } from "node:child_process";

// Executado uma vez, antes de toda a suíte de integração: aplica as migrations
// no banco de teste (idempotente). O banco precisa existir previamente e ser
// DESCARTÁVEL — as tabelas são truncadas entre os casos de teste.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL não está definida. Os testes de integração exigem um " +
        "PostgreSQL real e descartável (não use o banco de desenvolvimento, pois " +
        "as tabelas são truncadas). Veja docs/banco-de-dados.md.",
    );
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
