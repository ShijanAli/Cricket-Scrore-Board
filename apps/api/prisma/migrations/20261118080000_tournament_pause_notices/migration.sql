-- AlterEnum
ALTER TYPE "TournamentStatus" ADD VALUE 'paused';

-- CreateTable
CREATE TABLE "tournament_notices" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "message" VARCHAR(1000) NOT NULL DEFAULT '',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ,

    CONSTRAINT "tournament_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournament_notices_tournamentId_createdAt_idx" ON "tournament_notices"("tournamentId", "createdAt");

-- AddForeignKey
ALTER TABLE "tournament_notices" ADD CONSTRAINT "tournament_notices_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
