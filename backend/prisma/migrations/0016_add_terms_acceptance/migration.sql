-- First-login terms acceptance (provider + customer agreements)
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);