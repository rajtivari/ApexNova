CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'WORKER', 'CAPTAIN', 'PLAYER');
CREATE TYPE "TournamentFormat" AS ENUM ('BATTLE_ROYALE', 'ROUND_ROBIN', 'SINGLE_ELIMINATION');
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'LIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ResultStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'ENTRY_FEE', 'PRIZE_PAYOUT', 'WITHDRAWAL', 'REFERRAL_BONUS');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'PLAYER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Profile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Kyc" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "encryptedAadhaar" TEXT NOT NULL,
  "maskedAadhaar" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  CONSTRAINT "Kyc_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Wallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Team" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "captainId" TEXT NOT NULL,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TeamMember" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Tournament" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "game" TEXT NOT NULL,
  "format" "TournamentFormat" NOT NULL,
  "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
  "entryFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "prizePool" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "registrationClosesAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TournamentRegistration" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
  CONSTRAINT "TournamentRegistration_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Match" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "round" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "roomId" TEXT,
  "roomPassword" TEXT,
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MatchResult" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "submittedById" TEXT NOT NULL,
  "kills" INTEGER NOT NULL DEFAULT 0,
  "placement" INTEGER NOT NULL DEFAULT 0,
  "proofUrl" TEXT NOT NULL,
  "status" "ResultStatus" NOT NULL DEFAULT 'SUBMITTED',
  "killPoints" INTEGER NOT NULL DEFAULT 0,
  "placementPoints" INTEGER NOT NULL DEFAULT 0,
  "totalPoints" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Standing" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
  "kills" INTEGER NOT NULL DEFAULT 0,
  "totalPoints" INTEGER NOT NULL DEFAULT 0,
  "rank" INTEGER NOT NULL,
  CONSTRAINT "Standing_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Dispute" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "resultId" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "evidenceUrl" TEXT,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Referral" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "refereeId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "rewarded" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE UNIQUE INDEX "Kyc_userId_key" ON "Kyc"("userId");
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE UNIQUE INDEX "TournamentRegistration_tournamentId_teamId_key" ON "TournamentRegistration"("tournamentId", "teamId");
CREATE UNIQUE INDEX "MatchResult_matchId_teamId_key" ON "MatchResult"("matchId", "teamId");
CREATE UNIQUE INDEX "Standing_tournamentId_teamId_key" ON "Standing"("tournamentId", "teamId");
CREATE UNIQUE INDEX "Referral_refereeId_key" ON "Referral"("refereeId");

ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Kyc" ADD CONSTRAINT "Kyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "MatchResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
