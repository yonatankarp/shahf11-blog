#!/usr/bin/env node
// Dist-side check on the built site. Guards the regressions a passing build
// won't catch on its own:
//   1. every page keeps <html lang="he" dir="rtl"> (RTL is core to this blog)
//   2. every page has a non-empty <title>
//   3. every local <img> pointing at images/ or gallery/photos/ is base-prefixed
//      — this is what rewriteImageBase + withBase produce; a miss ships broken
//      images that still build fine
//   4. each referenced image file actually exists in dist/
//   5. post pages were generated
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const BASE = '/shahf11-blog';

if (!existsSync(distDir)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const failures = [];
const files = await htmlFiles(distDir);
let imgCount = 0;

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const rel = path.relative(distDir, file);

  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  if (!/\blang=["']he["']/i.test(htmlTag) || !/\bdir=["']rtl["']/i.test(htmlTag)) {
    failures.push(`${rel}: <html> missing lang="he" dir="rtl"`);
  }

  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!title || !title[1].trim()) failures.push(`${rel}: empty or missing <title>`);

  for (const m of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    const src = m[1];
    if (!/(?:^|\/|\.\.\/)(?:images|gallery\/(?:photos|thumbs))\//.test(src)) continue;
    imgCount += 1;
    if (!src.startsWith(`${BASE}/`)) {
      failures.push(`${rel}: image src not base-prefixed: ${src}`);
      continue;
    }
    // BASE is a URL prefix, not a dist subdirectory — files live at dist/images/.
    if (!existsSync(path.join(distDir, src.slice(BASE.length + 1)))) {
      failures.push(`${rel}: image file missing in dist: ${src}`);
    }
  }
}

const postsDir = path.join(distDir, 'posts');
const postCount = existsSync(postsDir)
  ? (await readdir(postsDir, { withFileTypes: true })).filter((d) => d.isDirectory()).length
  : 0;
if (postCount < 1) failures.push('no post pages generated under dist/posts/');

const manifest = loadYaml(await readFile(path.join(rootDir, 'gallery', 'photos.yaml'), 'utf8'));
const expectedPhotos = Array.isArray(manifest?.photos) ? manifest.photos.length : 0;
const galleryHtml = await readFile(path.join(distDir, 'gallery', 'index.html'), 'utf8');
const galleryImageCount = new Set(
  [...galleryHtml.matchAll(/<img\b[^>]*\bsrc=["']([^"']*\/gallery\/thumbs\/[^"']+)["']/gi)].map((m) => m[1]),
).size;
if (galleryImageCount !== expectedPhotos) failures.push(`gallery page expected ${expectedPhotos} photos, found ${galleryImageCount}`);
for (const requiredClass of ['gallery-carousel', 'gallery-lightbox', 'data-gallery-index']) {
  if (!galleryHtml.includes(requiredClass)) failures.push(`gallery page missing ${requiredClass}`);
}

if (failures.length > 0) {
  console.error('Site metadata check failed:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log(
  `Metadata OK: ${files.length} pages, ${postCount} posts, ${imgCount} image refs base-prefixed and present.`,
);
