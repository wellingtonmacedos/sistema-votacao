-- Força a troca da senha no primeiro login (senhas provisórias criadas pelo seed).
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
