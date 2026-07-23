import { mkdir, rm, readdir, copyFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Resized copies of the repo-root originals. Originals stay untouched;
// public/ gets web-sized derivatives. Incremental: skips up-to-date files.
const DISPLAY_MAX = 1600; // post scans, book scans, lightbox
const THUMB_MAX = 480; // gallery carousel + grid

const resizable = /\.(jpe?g|png|webp)$/i;

async function mtime(p) {
  try { return (await stat(p)).mtimeMs; } catch { return -1; }
}

async function syncResized(srcDir, destDir, maxWidth, dims) {
  await mkdir(destDir, { recursive: true });
  const srcNames = await readdir(srcDir);
  for (const name of await readdir(destDir)) {
    if (name.startsWith('.')) continue;
    if (!srcNames.includes(name)) await rm(path.join(destDir, name), { recursive: true });
  }
  let converted = 0;
  for (const name of srcNames) {
    if (name.startsWith('.')) continue;
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    if ((await stat(src)).isDirectory()) continue;
    if (!resizable.test(name)) {
      if (await mtime(dest) < await mtime(src)) await copyFile(src, dest);
      continue;
    }
    if (await mtime(dest) > await mtime(src)) {
      if (dims) {
        const meta = await sharp(dest).metadata();
        dims[name] = { width: meta.width, height: meta.height };
      }
      continue;
    }
    const pipeline = sharp(src).rotate().resize({ width: maxWidth, withoutEnlargement: true });
    const out = /\.png$/i.test(name)
      ? pipeline.png()
      : /\.webp$/i.test(name)
        ? pipeline.webp({ quality: 80 })
        : pipeline.jpeg({ quality: 80, mozjpeg: true });
    const info = await out.toFile(dest);
    if (dims) dims[name] = { width: info.width, height: info.height };
    converted += 1;
  }
  return converted;
}

const dims = {};
const galleryDims = { photos: {}, thumbs: {} };
const a = await syncResized('images', 'public/images', DISPLAY_MAX, dims);
const b = await syncResized('gallery/photos', 'public/gallery/photos', DISPLAY_MAX, galleryDims.photos);
const c = await syncResized('gallery/photos', 'public/gallery/thumbs', THUMB_MAX, galleryDims.thumbs);
await writeFile('public/images-dimensions.json', JSON.stringify(dims));
await writeFile('public/gallery-dimensions.json', JSON.stringify(galleryDims));
console.log(`images -> public/images (${a} converted), gallery -> photos (${b}) + thumbs (${c})`);
