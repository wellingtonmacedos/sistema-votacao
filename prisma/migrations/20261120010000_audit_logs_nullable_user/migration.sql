-- Permite registrar eventos sem usuário identificado (ex.: tentativa de login
-- com email inexistente) e acelera a consulta dos logs na tela de auditoria.
ALTER TABLE "audit_logs" ALTER COLUMN "userId" DROP NOT NULL;

-- Ao excluir um usuário, preserva o histórico de auditoria (apenas desvincula).
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
