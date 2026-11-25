-- Apelido do vereador/presidente: é o nome exibido nos cards (nome de urna).
-- Opcional; quando vazio, o sistema exibe o nome completo.
ALTER TABLE "users" ADD COLUMN "nickname" TEXT;
