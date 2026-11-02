ALTER TABLE "ProviderProfile"
ADD COLUMN "coverImageIsDemo" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ProviderProfile"
SET "coverImageIsDemo" = true
WHERE "coverImageUrl" IN (
  'https://res.cloudinary.com/u1ucoiox/image/upload/v1786893154/eventicate/Grand-Hall-Events/venues/garden-pavilion.jpg',
  'https://res.cloudinary.com/u1ucoiox/image/upload/v1786893155/eventicate/Delight-Catering-Co/catering/wedding-buffet.jpg',
  'https://res.cloudinary.com/u1ucoiox/image/upload/v1786893167/eventicate/SoundPro-PA-Systems/pa/dj-booth.jpg',
  'https://res.cloudinary.com/u1ucoiox/image/upload/v1793596684/eventicate/Tents-Africa/tents/marquee-garden-setup.jpg'
);
