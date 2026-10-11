DROP INDEX IF EXISTS "TeamMember_teamId_userId_key";

CREATE UNIQUE INDEX "Team_captainId_key" ON "Team"("captainId");
CREATE UNIQUE INDEX "TeamMember_userId_key" ON "TeamMember"("userId");
