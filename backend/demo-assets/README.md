# Eventicate demo images

`marquee-tent.png` is an AI-generated illustrative demo image created with the built-in ImageGen tool on 28 October 2026. It does not depict a verified provider, real booked event or specific real venue. Its visible caption is part of the generated image.

Prompt: Create one professional landscape 4:3 photograph-style image of a large white peaked marquee tent on a green lawn in a warm East African garden setting, with the open front showing neatly arranged round tables, white tablecloths and simple chairs. The tent is the main subject. Natural soft afternoon light, realistic fabric and support poles, believable event setup. No people, logos, branded equipment or fabricated business names. Add a small charcoal caption near the lower left, inset from the edges, with readable white text: AI-generated demo image.

The other six images used by `scripts/populate-demo-images.mjs` are labelled copies of the existing Cloudinary demo assets referenced in `prisma/seed.ts`. No third-party search images are used.

Run the script without `--apply` to preview changes. It only targets the four named seed businesses, preserves custom images, and requires a backup file before making changes. Do not run the full database seed just to add images.
