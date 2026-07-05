import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const iconsDir = join(rootDir, "public", "icons");
const sourcePath = join(rootDir, "assets", "app-icon.png");

const require = createRequire(import.meta.url);
const sharp = require(
  join(rootDir, "node_modules", ".pnpm", "sharp@0.34.5", "node_modules", "sharp"),
);

mkdirSync(iconsDir, { recursive: true });

function createIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + count * 16;
  for (let i = 0; i < count; i++) {
    const { size, data } = images[i];
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry[4] = 1;
    entry[5] = 0;
    entry[6] = 32;
    entry[7] = 0;
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((img) => img.data)]);
}

async function resizePng(size) {
  return sharp(sourcePath)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

const outputs = [
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
  { size: 180, name: "apple-touch-icon.png" },
];

for (const { size, name } of outputs) {
  const png = await resizePng(size);
  writeFileSync(join(iconsDir, name), png);
  console.log(`Wrote icons/${name}`);
}

const faviconSizes = [32, 16];
const faviconImages = [];
for (const size of faviconSizes) {
  faviconImages.push({ size, data: await resizePng(size) });
}

const faviconIco = createIco(faviconImages);
writeFileSync(join(rootDir, "public", "favicon.ico"), faviconIco);
writeFileSync(join(rootDir, "app", "favicon.ico"), faviconIco);
console.log("Wrote public/favicon.ico and app/favicon.ico");
