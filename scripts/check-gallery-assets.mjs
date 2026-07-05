#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const galleryDir = path.join(rootDir, 'gallery');
const photosDir = path.join(galleryDir, 'photos');
const manifestPath = path.join(galleryDir, 'photos.yaml');
const imagePattern = /\.(?:jpe?g|png|webp|gif|heic)$/i;

const doc = loadYaml(await readFile(manifestPath, 'utf8'));
const photos = Array.isArray(doc?.photos) ? doc.photos : [];
const manifestFiles = photos.map((photo) => photo?.file).filter(Boolean);
const actualFiles = (await readdir(photosDir)).filter((file) => imagePattern.test(file)).sort();

const failures = [];

const seen = new Set();
for (const [index, file] of manifestFiles.entries()) {
  if (seen.has(file)) failures.push(`duplicate manifest entry: ${file}`);
  seen.add(file);

  if (file.includes('/') || file.includes('\\')) {
    failures.push(`manifest file must be a filename only: ${file}`);
  }

  if (!existsSync(path.join(photosDir, file))) {
    failures.push(`manifest entry missing file: ${file}`);
  }

  const credit = photos[index]?.credit ?? '';
  if (/IMG_6539\.HEIC/i.test(`${file} ${credit}`)) {
    failures.push('IMG_6539.HEIC belongs to the homepage image, not the gallery manifest');
  }
}

for (const file of actualFiles) {
  if (!seen.has(file)) failures.push(`gallery photo missing from manifest: ${file}`);
}

if (failures.length > 0) {
  console.error('Gallery asset check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Gallery OK: ${actualFiles.length} photos listed in gallery/photos.yaml.`);
