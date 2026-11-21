import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.{test,spec}.{ts,tsx,js,mjs}"],
    // Os testes de integração exigem um Postgres real e são executados por
    // `npm run test:integration` (vitest.integration.config.mts).
    exclude: ["node_modules", ".next", "out", "tests/integration/**"],
  },
});
