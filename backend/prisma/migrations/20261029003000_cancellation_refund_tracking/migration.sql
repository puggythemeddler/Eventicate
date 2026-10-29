ALTER TABLE "Complaint" ADD COLUMN "refundReference" TEXT;
ALTER TABLE "Complaint" ADD COLUMN "refundPaidAt" TIMESTAMP(3);
ALTER TABLE "Complaint" ADD COLUMN "refundRecordedBy" TEXT;

CREATE UNIQUE INDEX "Complaint_open_cancellation_booking_key"
ON "Complaint" ("bookingId")
WHERE "complaintType" = 'cancellation_request' AND "status" IN ('open', 'investigating');
