ALTER TABLE "Tournament" ADD COLUMN "rules" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TournamentRegistration" ADD COLUMN "gameUid" TEXT;
ALTER TABLE "TournamentRegistration" ADD COLUMN "inGameName" TEXT;
ALTER TABLE "TournamentRegistration" ADD COLUMN "rulesAcceptedAt" TIMESTAMP(3);

CREATE TYPE "RegistrationPaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED');

ALTER TABLE "TournamentRegistration"
  ADD COLUMN "paymentStatus" "RegistrationPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "paymentReviewedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "TournamentRegistration_paymentReference_key" ON "TournamentRegistration"("paymentReference");

ALTER TABLE "Transaction" ADD COLUMN "reference" TEXT;
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

ALTER TABLE "Kyc"
  ALTER COLUMN "encryptedAadhaar" DROP NOT NULL,
  ALTER COLUMN "maskedAadhaar" DROP NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN "selfieDocumentKey" TEXT,
  ADD COLUMN "aadhaarDocumentKey" TEXT,
  ADD COLUMN "selfieMimeType" TEXT,
  ADD COLUMN "aadhaarMimeType" TEXT,
  ADD COLUMN "ageVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewNote" TEXT;

CREATE TABLE "WithdrawalRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "encryptedDestination" TEXT NOT NULL,
  "maskedDestination" TEXT NOT NULL,
  "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WithdrawalRequest_transactionId_key" ON "WithdrawalRequest"("transactionId");
CREATE INDEX "WithdrawalRequest_status_createdAt_idx" ON "WithdrawalRequest"("status", "createdAt");
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
