// Renders the app icons in public/ from inline SVG. Run: npm run icons
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const cross = 'M26 14h12v12h12v12H38v12H26V38H14V26h12z';
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#226fbc"/><path d="${cross}" fill="#fff"/></svg>`;
// Maskable: full-bleed background, cross shrunk into the 80% safe zone.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#226fbc"/><g transform="translate(32 32) scale(0.7) translate(-32 -32)"><path d="${cross}" fill="#fff"/></g></svg>`;
// Apple touch icons get their corners rounded by iOS.
const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#226fbc"/><g transform="translate(32 32) scale(0.85) translate(-32 -32)"><path d="${cross}" fill="#fff"/></g></svg>`;

writeFileSync('public/favicon.svg', rounded + '\n');
const out = [
  [rounded, 192, 'public/icon-192.png'],
  [rounded, 512, 'public/icon-512.png'],
  [maskable, 512, 'public/icon-maskable-512.png'],
  [square, 180, 'public/apple-touch-icon.png'],
];
for (const [svg, size, file] of out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
}
console.log('icons written');
