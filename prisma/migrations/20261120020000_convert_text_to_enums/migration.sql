-- Alinha as migrations ao schema Prisma.
--
-- A migration baseline (0_init) criou estas colunas como TEXT, enquanto o
-- schema.prisma as define como enums — o que deixava o check de sincronia da CI
-- (prisma migrate diff --exit-code) vermelho. Esta migração converte os valores
-- para os tipos enum e ajusta o default de "phases"."color".
--
-- A criação dos tipos é guardada (só cria se ainda não existir) para funcionar
-- tanto em bancos criados via migrations (colunas TEXT) quanto em bancos já
-- criados via `prisma db push` (colunas já em enum). Os ALTERs de coluna são
-- idempotentes em ambos os casos.

-- 1) Cria os tipos enum definidos no schema.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PRESIDENT', 'COUNCILOR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SessionStatus') THEN
    CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'PEQUENO_EXPEDIENTE', 'GRANDE_EXPEDIENTE', 'ORDEM_DO_DIA', 'CONSIDERACOES_FINAIS', 'TRIBUNA_LIVE', 'CLOSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VoteType') THEN
    CREATE TYPE "VoteType" AS ENUM ('YES', 'NO', 'ABSTENTION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatterStatus') THEN
    CREATE TYPE "MatterStatus" AS ENUM ('PENDING', 'VOTING', 'APPROVED', 'REJECTED', 'ABSTAINED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SpeechType') THEN
    CREATE TYPE "SpeechType" AS ENUM ('CONSIDERACOES_FINAIS', 'TRIBUNA_LIVE');
  END IF;
END $$;

-- 2) users.role -> UserRole
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'COUNCILOR';

-- 3) voting_sessions.status -> SessionStatus
ALTER TABLE "voting_sessions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "voting_sessions" ALTER COLUMN "status" TYPE "SessionStatus" USING ("status"::"SessionStatus");
ALTER TABLE "voting_sessions" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

-- 4) matters.status -> MatterStatus
ALTER TABLE "matters" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "matters" ALTER COLUMN "status" TYPE "MatterStatus" USING ("status"::"MatterStatus");
ALTER TABLE "matters" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- 5) votes.voteType -> VoteType
ALTER TABLE "votes" ALTER COLUMN "voteType" TYPE "VoteType" USING ("voteType"::"VoteType");

-- 6) document_votes.voteType -> VoteType
ALTER TABLE "document_votes" ALTER COLUMN "voteType" TYPE "VoteType" USING ("voteType"::"VoteType");

-- 7) speech_requests.type -> SpeechType
ALTER TABLE "speech_requests" ALTER COLUMN "type" TYPE "SpeechType" USING ("type"::"SpeechType");

-- 8) phases.color: alinha o default ao schema.prisma.
ALTER TABLE "phases" ALTER COLUMN "color" SET DEFAULT '#6366f1';
