// Roda antes de cada arquivo de teste e antes de seus imports. `lib/db` lê
// DATABASE_URL no momento do import, então apontamos o Prisma para o banco de
// teste aqui (sobrescrevendo qualquer valor de desenvolvimento do ambiente).
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error(
    "TEST_DATABASE_URL não está definida. Veja tests/integration/global-setup.ts.",
  );
}

process.env.DATABASE_URL = url;
