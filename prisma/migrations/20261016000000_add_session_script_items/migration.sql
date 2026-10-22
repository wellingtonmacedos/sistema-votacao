CREATE TABLE "session_script_items" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sectionTitle" TEXT,
    "content" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "presidentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_script_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "session_script_items"
ADD CONSTRAINT "session_script_items_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "voting_sessions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
