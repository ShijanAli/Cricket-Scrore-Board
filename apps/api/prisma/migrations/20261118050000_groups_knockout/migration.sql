-- AlterEnum
ALTER TYPE "TournamentFormat" ADD VALUE 'groups_knockout';

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN "groupCount" INTEGER;

-- AlterTable
ALTER TABLE "tournament_teams" ADD COLUMN "groupName" VARCHAR(2);
