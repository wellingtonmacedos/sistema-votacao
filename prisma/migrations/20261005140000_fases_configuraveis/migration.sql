-- Fases configuráveis: o status da sessão e o histórico de fases passam de enum para texto
-- (convertendo os valores existentes) e as fases atuais viram registros editáveis.

-- AlterTable
ALTER TABLE "voting_sessions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "voting_sessions" ALTER COLUMN "status" SET DATA TYPE TEXT USING "status"::TEXT;
ALTER TABLE "voting_sessions" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "session_phases" ALTER COLUMN "phase" SET DATA TYPE TEXT USING "phase"::TEXT;

-- DropEnum
DROP TYPE "SessionStatus";

-- CreateTable
CREATE TABLE "phase_definitions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hasDocuments" BOOLEAN NOT NULL DEFAULT false,
    "hasVoting" BOOLEAN NOT NULL DEFAULT false,
    "isVotingAgenda" BOOLEAN NOT NULL DEFAULT false,
    "speechType" "SpeechType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phase_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phase_definitions_key_key" ON "phase_definitions"("key");

-- Fases padrão (equivalentes às fases fixas anteriores)
INSERT INTO "phase_definitions" ("id", "key", "name", "orderIndex", "color", "hasDocuments", "hasVoting", "isVotingAgenda", "speechType", "updatedAt") VALUES
    ('phase_pequeno_expediente', 'PEQUENO_EXPEDIENTE', 'Pequeno Expediente', 1, 'blue', true, true, false, NULL, CURRENT_TIMESTAMP),
    ('phase_grande_expediente', 'GRANDE_EXPEDIENTE', 'Grande Expediente', 2, 'purple', true, true, false, NULL, CURRENT_TIMESTAMP),
    ('phase_ordem_do_dia', 'ORDEM_DO_DIA', 'Ordem do Dia', 3, 'red', false, true, true, NULL, CURRENT_TIMESTAMP),
    ('phase_consideracoes_finais', 'CONSIDERACOES_FINAIS', 'Considerações Finais', 4, 'green', false, false, false, 'CONSIDERACOES_FINAIS', CURRENT_TIMESTAMP),
    ('phase_tribuna_livre', 'TRIBUNA_LIVE', 'Tribuna Livre', 5, 'yellow', false, false, false, 'TRIBUNA_LIVE', CURRENT_TIMESTAMP);
