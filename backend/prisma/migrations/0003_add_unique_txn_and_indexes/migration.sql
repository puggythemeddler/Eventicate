-- Unique transactionId on Payment (guards against double-recorded gateway callbacks)
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- Indexes for common Payment lookups
CREATE INDEX "Payment_bookingId_status_idx" ON "Payment"("bookingId", "status");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- Indexes for Booking dashboard / list queries
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_providerId_status_idx" ON "Booking"("providerId", "status");
CREATE INDEX "Booking_customerId_status_idx" ON "Booking"("customerId", "status");
CREATE INDEX "Booking_eventId_idx" ON "Booking"("eventId");

-- Index for multi-provider quote grouping
CREATE INDEX "Document_masterQuoteId_idx" ON "Document"("masterQuoteId");

-- Indexes for messaging queries
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_senderId_isRead_idx" ON "Message"("senderId", "isRead");
CREATE INDEX "Message_receiverId_isRead_idx" ON "Message"("receiverId", "isRead");

-- Indexes for notification queries
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- Indexes for Event queries
CREATE INDEX "Event_customerId_idx" ON "Event"("customerId");
CREATE INDEX "Event_eventDate_idx" ON "Event"("eventDate");