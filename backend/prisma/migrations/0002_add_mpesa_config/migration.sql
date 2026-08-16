-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN "mpesaEnv" TEXT NOT NULL DEFAULT 'sandbox',
ADD COLUMN "mpesaConsumerKey" TEXT,
ADD COLUMN "mpesaConsumerSecret" TEXT,
ADD COLUMN "mpesaPasskey" TEXT,
ADD COLUMN "mpesaShortcode" TEXT NOT NULL DEFAULT '174379',
ADD COLUMN "mpesaCallbackUrl" TEXT,
ADD COLUMN "mpesaCallbackSecret" TEXT;