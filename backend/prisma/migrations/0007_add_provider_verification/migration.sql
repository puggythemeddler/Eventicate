-- Provider verification levels: NONE / PENDING / VERIFIED / REJECTED
ALTER TABLE "ProviderProfile"
    ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'NONE',
    ADD COLUMN "verificationSubmittedAt" TIMESTAMP(3),
    ADD COLUMN "verifiedAt" TIMESTAMP(3),
    ADD COLUMN "verificationDocuments" TEXT NOT NULL DEFAULT '[]',
    ADD COLUMN "verificationNote" TEXT;