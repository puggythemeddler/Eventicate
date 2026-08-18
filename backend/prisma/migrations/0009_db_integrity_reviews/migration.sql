-- DB integrity: stop destructive cascades into financial records, dedupe and
-- lock reviews to one per (booking, reviewer, role), and add hot-path indexes.

-- 1. Prevent an Event deletion from destroying its Bookings (and, via cascade,
--    their Payments / documents / reviews).
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_eventId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Prevent a Booking deletion from destroying Payment records.
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bookingId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Dedupe any pre-existing duplicate reviews, keeping the earliest per reviewer.
DELETE FROM "Review" r
USING "Review" r2
WHERE r."bookingId" = r2."bookingId"
  AND r."reviewerId" = r2."reviewerId"
  AND r."reviewerRole" = r2."reviewerRole"
  AND r."createdAt" > r2."createdAt";

-- 4. Enforce one review per (booking, reviewer, role) at the database level.
CREATE UNIQUE INDEX "Review_bookingId_reviewerId_reviewerRole_key" ON "Review"("bookingId", "reviewerId", "reviewerRole");

-- 5. Hot-path indexes.
CREATE INDEX "Review_bookingId_idx" ON "Review"("bookingId");
CREATE INDEX "Review_revieweeId_idx" ON "Review"("revieweeId");
CREATE INDEX "Review_reviewerId_idx" ON "Review"("reviewerId");

CREATE INDEX "Complaint_reporterId_idx" ON "Complaint"("reporterId");
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

CREATE INDEX "ProviderProfile_category_idx" ON "ProviderProfile"("category");
CREATE INDEX "ProviderProfile_isApproved_idx" ON "ProviderProfile"("isApproved");
CREATE INDEX "ProviderProfile_city_idx" ON "ProviderProfile"("city");