// Attach labelled Cloudinary demo photos to the seeded businesses only.
// Dry-run by default. Does not create accounts or alter prices, ratings or bookings.
// node --env-file=backend/.env backend/scripts/populate-demo-images.mjs --apply --backup <path>
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');
const backupIndex = process.argv.indexOf('--backup');
const backupPath = backupIndex >= 0 ? process.argv[backupIndex + 1] : null;
const folder = 'eventicate/demo/illustrative-v1';
const assets = {
  grandBallroom: 'grand-ballroom', gardenPavilion: 'garden-pavilion',
  weddingBuffet: 'wedding-buffet', signaturePlate: 'signature-plate',
  marqueeTent: 'marquee-tent-v2', concertRig: 'concert-rig', djBooth: 'dj-booth',
};
const targets = [
  { email: 'venue@grandhall.com', name: 'Grand Hall Events', cover: 'grandBallroom',
    venues: { 'Grand Ballroom': ['grandBallroom'], 'Garden Pavilion': ['gardenPavilion'] } },
  { email: 'catering@delight.com', name: 'Delight Catering Co.', cover: 'weddingBuffet',
    menuPackages: { 'Wedding Package': ['weddingBuffet'], 'Funeral Package': ['signaturePlate'] } },
  { email: 'pa@soundpro.com', name: 'SoundPro PA Systems', cover: 'concertRig',
    services: { 'Full PA System Package': ['concertRig', 'djBooth'] },
    equipment: { 'JBL PRX Speakers': ['concertRig'], 'Yamaha MG16 Mixer': ['djBooth'] } },
  { email: 'tents@canopy.com', name: 'Tents Africa', cover: 'marqueeTent',
    equipment: { '10x20 Marquee Tent': ['marqueeTent'], '15x30 Wedding Marquee': ['marqueeTent'], '20x20 Canopy Tent': ['marqueeTent'] } },
];
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

async function main() {
  const seed = await fs.readFile(new URL('../prisma/seed.ts', import.meta.url), 'utf8');
  const sources = Object.fromEntries([...seed.matchAll(/(\w+): "(https:\/\/res\.cloudinary\.com\/[^"\s]+)"/g)].map(match => [match[1], match[2]]));
  const originalUrls = new Set(Object.values(sources));
  const providers = await db.providerProfile.findMany({
    where: { user: { email: { in: targets.map(target => target.email) } } },
    select: { id: true, businessName: true, coverImageUrl: true, user: { select: { email: true } },
      services: { select: { id: true, name: true, images: true } },
      equipment: { select: { id: true, name: true, images: true } },
      venues: { select: { id: true, name: true, images: true } },
      menuPackages: { select: { id: true, name: true, images: true } } },
  });
  const changes = [];
  const safeUrl = url => originalUrls.has(url) || (url.startsWith('https://res.cloudinary.com/' + process.env.CLOUDINARY_CLOUD_NAME + '/image/upload/') && url.includes('/' + folder + '/'));
  for (const target of targets) {
    const provider = providers.find(row => row.user.email === target.email);
    if (!provider || provider.businessName !== target.name) throw new Error(`Seeded business does not match: ${target.name}`);
    if (!provider.coverImageUrl || safeUrl(provider.coverImageUrl)) {
      changes.push({ model: 'providerProfile', id: provider.id, field: 'coverImageUrl', oldValue: provider.coverImageUrl, keys: [target.cover], label: provider.businessName });
    }
    for (const relation of ['services', 'equipment', 'venues', 'menuPackages']) {
      for (const [name, keys] of Object.entries(target[relation] || {})) {
        const item = provider[relation].find(row => row.name === name);
        if (!item) continue;
        let current;
        try { current = JSON.parse(item.images || '[]'); } catch { continue; }
        if (!Array.isArray(current) || !current.every(url => typeof url === 'string' && safeUrl(url))) continue;
        const model = { services: 'service', equipment: 'equipment', venues: 'venue', menuPackages: 'menuPackage' }[relation];
        changes.push({ model, id: item.id, field: 'images', oldValue: item.images, keys, label: provider.businessName + ' / ' + name });
      }
    }
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', providers: providers.length, candidates: changes.map(({label, field}) => ({ label, field })) }, null, 2));
  if (!apply) return;
  if (!backupPath) throw new Error('An explicit --backup path is required before applying changes');
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_CLOUD_NAME) throw new Error('Cloudinary is not configured');
  // Save previous values before making any external changes. Never include credentials.
  await fs.writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), changes }, null, 2), { flag: 'wx' });
  const uploaded = {};
  for (const key of new Set(changes.flatMap(change => change.keys))) {
    const source = key === 'marqueeTent'
      ? fileURLToPath(new URL('../demo-assets/marquee-tent.png', import.meta.url))
      : sources[key];
    if (!source || !assets[key]) throw new Error('Unknown source image: ' + key);
    const response = await cloudinary.uploader.upload(source, {
      resource_type: 'image', public_id: folder + '/' + assets[key], overwrite: false,
      tags: ['eventicate', 'demo', 'illustrative'],
      context: { caption: key === 'marqueeTent' ? 'AI-generated demo image, not verified provider work' : 'Demo image — illustrative only, not verified provider work', source_url: key === 'marqueeTent' ? 'AI-generated for Eventicate; prompt saved in backend/demo-assets/README.md' : source },
      transformation: key === 'marqueeTent' ? [{ width: 1400, height: 1050, crop: 'fill' }] : [
        { width: 1400, height: 1050, crop: 'fill', gravity: 'auto' },
        { overlay: { font_family: 'Arial', font_size: 38, font_weight: 'bold', text: 'Demo image - illustrative only' }, color: 'white', background: '#292624' },
        { flags: 'layer_apply', gravity: 'south_west', x: 28, y: 100 },
      ],
    });
    if (!response.secure_url.includes('/' + folder + '/')) throw new Error('Unexpected Cloudinary destination');
    const check = await fetch(response.secure_url, { method: 'HEAD' });
    if (!check.ok) throw new Error('Uploaded image is not publicly reachable');
    uploaded[key] = response.secure_url;
    console.log(JSON.stringify({ uploaded: key, url: response.secure_url }));
  }
  const updated = await db.$transaction(async tx => {
    let count = 0;
    for (const change of changes) {
      const urls = change.keys.map(key => uploaded[key]);
      const value = change.field === 'images' ? JSON.stringify(urls) : urls[0];
      if (value === change.oldValue) continue;
      // Compare-and-set protects photos changed by a provider since the preview.
      const result = await tx[change.model].updateMany({ where: { id: change.id, [change.field]: change.oldValue }, data: { [change.field]: value } });
      count += result.count;
    }
    return count;
  }, { timeout: 60000, maxWait: 10000 });
  await fs.writeFile(backupPath + '.result.json', JSON.stringify({ updated, uploaded }, null, 2));
  console.log(JSON.stringify({ updated, cloudinaryAssets: Object.keys(uploaded).length, backup: backupPath }));
}
main().catch(error => { console.error(error.message || 'Demo image population failed'); process.exitCode = 1; }).finally(() => db.$disconnect());
