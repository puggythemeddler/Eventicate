-- Complaint disputes upgrade: classification, priority, evidence, resolution and refund tracking.
ALTER TABLE "Complaint"
    ADD COLUMN "complaintType" TEXT NOT NULL DEFAULT 'other',
    ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal',
    ADD COLUMN "evidenceUrls" TEXT NOT NULL DEFAULT '[]',
    ADD COLUMN "resolution" TEXT,
    ADD COLUMN "refundAmount" DOUBLE PRECISION,
    ADD COLUMN "resolvedAt" TIMESTAMP(3);