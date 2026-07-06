import { mkdir, readdir, rename } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// One-time migration: each sharpened PNG in images/ becomes a web-source JPEG
// (images/<name>.jpg, 2048px q88, rotation baked) and the pristine PNG moves to
// images-original/<name>.png (Git LFS cold backup). Pre-existing JPGs are untouched.
// The Gemini upscaler suffixes some outputs with `_upscaled`; strip it so names
// match the filenames posts already reference.
const SRC = 'images';
const BACKUP = 'images-original';
const MAX = 2048;

await mkdir(BACKUP, { recursive: true });
const names = (await readdir(SRC)).filter((n) => /\.png$/i.test(n));
if (names.length === 0) {
  console.log('No PNGs in images/ — nothing to migrate.');
  process.exit(0);
}

let done = 0;
for (const name of names) {
  const png = path.join(SRC, name);
  const base = name.replace(/\.png$/i, '').replace(/_upscaled$/i, '');
  await sharp(png)
    .rotate()
    .resize({ width: MAX, withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(SRC, `${base}.jpg`));
  await rename(png, path.join(BACKUP, `${base}.png`));
  done += 1;
}
console.log(`Migrated ${done} PNG(s): images/*.jpg written, originals -> ${BACKUP}/`);
