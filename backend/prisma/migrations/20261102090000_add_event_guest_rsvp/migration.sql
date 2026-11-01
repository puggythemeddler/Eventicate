CREATE TYPE "RSVPStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE "EventGuest" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "contactPermissionAt" TIMESTAMP(3) NOT NULL,
  "guestsInvited" INTEGER NOT NULL DEFAULT 1,
  "guestsAttending" INTEGER NOT NULL DEFAULT 0,
  "rsvpStatus" "RSVPStatus" NOT NULL DEFAULT 'PENDING',
  "inviteTokenHash" TEXT,
  "invitationSentAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventGuest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventGuest_inviteTokenHash_key" ON "EventGuest"("inviteTokenHash");
CREATE UNIQUE INDEX "EventGuest_eventId_email_key" ON "EventGuest"("eventId", "email");
CREATE INDEX "EventGuest_eventId_rsvpStatus_idx" ON "EventGuest"("eventId", "rsvpStatus");

ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
