-- Track last activity so inactive accounts can be auto-deactivated.

ALTER TABLE "User" ADD COLUMN "lastActiveAt" TIMESTAMP(3);

CREATE INDEX "User_isActive_lastActiveAt_idx" ON "User"("isActive", "lastActiveAt");