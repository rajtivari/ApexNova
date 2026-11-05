ALTER TABLE "Tournament" ADD COLUMN "rules" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TournamentRegistration" ADD COLUMN "gameUid" TEXT;
ALTER TABLE "TournamentRegistration" ADD COLUMN "inGameName" TEXT;
ALTER TABLE "TournamentRegistration" ADD COLUMN "rulesAcceptedAt" TIMESTAMP(3);
