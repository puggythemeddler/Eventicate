-- Add per-product location (city + country) to services and equipment so providers
-- can set where each product is based, defaulting from their settings location.
ALTER TABLE "Service" ADD COLUMN "locationCity" TEXT;
ALTER TABLE "Service" ADD COLUMN "locationCountry" TEXT;
ALTER TABLE "Equipment" ADD COLUMN "locationCity" TEXT;
ALTER TABLE "Equipment" ADD COLUMN "locationCountry" TEXT;