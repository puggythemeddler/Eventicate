-- Normalize event status values to the uppercase enum form used by the API.
UPDATE "Event" SET "status" = UPPER("status");