-- WhatsApp Cloud API bridge
-- 1. WhatsApp status tracking + dedupe on Message
CREATE TYPE "WhatsAppStatus" AS ENUM ('NONE', 'SENT', 'FAILED');

ALTER TABLE "Message" ADD COLUMN "waMessageId" TEXT,
ADD COLUMN "waStatus" "WhatsAppStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "waError" TEXT;

CREATE UNIQUE INDEX "Message_waMessageId_key" ON "Message"("waMessageId");

-- 2. WhatsApp config on SystemConfig
ALTER TABLE "SystemConfig" ADD COLUMN "whatsappAccessToken" TEXT,
ADD COLUMN "whatsappPhoneId" TEXT,
ADD COLUMN "whatsappVerifyToken" TEXT,
ADD COLUMN "whatsappBusinessPhone" TEXT;