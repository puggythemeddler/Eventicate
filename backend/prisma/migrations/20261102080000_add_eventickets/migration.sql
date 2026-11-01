CREATE TYPE "TicketEventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "TicketOrderStatus" AS ENUM ('FREE_CONFIRMED', 'PENDING', 'PAID', 'CANCELLED', 'REFUNDED');
CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'CHECKED_IN', 'CANCELLED');
CREATE TYPE "TicketFeePayer" AS ENUM ('ORGANIZER', 'ATTENDEE');

ALTER TABLE "SystemConfig" ADD COLUMN "ticketCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.06;

CREATE TABLE "TicketEvent" (
  "id" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "timeZone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  "venueName" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'Kenya',
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "imageUrl" TEXT,
  "status" "TicketEventStatus" NOT NULL DEFAULT 'DRAFT',
  "feePayer" "TicketFeePayer" NOT NULL DEFAULT 'ORGANIZER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketType" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL,
  "sold" INTEGER NOT NULL DEFAULT 0,
  "salesStartAt" TIMESTAMP(3),
  "salesEndAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketOrder" (
  "id" TEXT NOT NULL,
  "orderCode" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "ticketTypeId" TEXT NOT NULL,
  "buyerId" TEXT,
  "buyerName" TEXT NOT NULL,
  "buyerEmail" TEXT NOT NULL,
  "buyerPhone" TEXT,
  "quantity" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "ticketSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "platformFeeRate" DECIMAL(6,5) NOT NULL DEFAULT 0,
  "platformFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "paymentProcessingFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "feePayer" "TicketFeePayer" NOT NULL DEFAULT 'ORGANIZER',
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "organizerNetAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "TicketOrderStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "ticketCode" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'VALID',
  "checkedInAt" TIMESTAMP(3),
  "checkedInById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TicketEvent_slug_key" ON "TicketEvent"("slug");
CREATE INDEX "TicketEvent_organizerId_status_idx" ON "TicketEvent"("organizerId", "status");
CREATE INDEX "TicketEvent_status_startsAt_idx" ON "TicketEvent"("status", "startsAt");
CREATE INDEX "TicketEvent_country_city_idx" ON "TicketEvent"("country", "city");
CREATE UNIQUE INDEX "TicketType_eventId_name_key" ON "TicketType"("eventId", "name");
CREATE INDEX "TicketType_eventId_isActive_idx" ON "TicketType"("eventId", "isActive");
CREATE UNIQUE INDEX "TicketOrder_orderCode_key" ON "TicketOrder"("orderCode");
CREATE UNIQUE INDEX "TicketOrder_idempotencyKey_key" ON "TicketOrder"("idempotencyKey");
CREATE INDEX "TicketOrder_eventId_status_idx" ON "TicketOrder"("eventId", "status");
CREATE INDEX "TicketOrder_ticketTypeId_status_idx" ON "TicketOrder"("ticketTypeId", "status");
CREATE INDEX "TicketOrder_buyerEmail_idx" ON "TicketOrder"("buyerEmail");
CREATE UNIQUE INDEX "Ticket_ticketCode_key" ON "Ticket"("ticketCode");
CREATE INDEX "Ticket_orderId_status_idx" ON "Ticket"("orderId", "status");

ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_organizerId_fkey"
  FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "TicketEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketOrder" ADD CONSTRAINT "TicketOrder_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "TicketEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketOrder" ADD CONSTRAINT "TicketOrder_ticketTypeId_fkey"
  FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketOrder" ADD CONSTRAINT "TicketOrder_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "TicketOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_checkedInById_fkey"
  FOREIGN KEY ("checkedInById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
