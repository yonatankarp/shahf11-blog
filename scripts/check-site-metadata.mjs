#!/usr/bin/env node
// Dist-side check on the built site. Guards the regressions a passing build
// won't catch on its own:
//   1. every page keeps <html lang="he" dir="rtl"> (RTL is core to this blog)
//   2. every page has a non-empty <title>
//   3. every local <img> pointing at images/ or gallery/photos/ is base-prefixed
//      via both src and deferred data-src attributes — this is what
//      rewriteImageBase + withBase produce; a miss ships broken images
//   4. each referenced image file actually exists in dist/
//   5. every <a> pointing at posts-pdf/ or book/ is base-prefixed and the PDF
//      file actually exists in dist/
//   6. every internal archive link resolves to a built page/file, and same-page
//      hash-only links point at an existing id/name. Cross-page fragments are
//      counted as internal links but currently checked only for file existence.
//   7. post pages were generated
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
// Empty at the apex root; local asset URLs are absolute-rooted (/images/…, /gallery/…).
const BASE = '';

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
let pdfCount = 0;
let internalLinkCount = 0;

function anchorTargets(html) {
  const targets = new Set();
  for (const m of html.matchAll(/\s(?:id|name)=["']([^"']+)["']/gi)) targets.add(m[1]);
  return targets;
}

function stripNonMarkupBodies(html) {
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
}

function distPathForLocalUrl(rawHref) {
  let urlPath;
  try {
    const url = new URL(rawHref, 'https://yonatankarp.com');
    if (url.origin !== 'https://yonatankarp.com') return null;
    urlPath = url.pathname;
  } catch {
    return null;
  }

  if (!urlPath.startsWith(`${BASE}/`) && urlPath !== BASE) return null;
  const localPath = urlPath.slice(BASE.length).replace(/^\/+/, '');
  if (localPath === '') return path.join(distDir, 'index.html');
  if (path.extname(localPath)) return path.join(distDir, localPath);
  return path.join(distDir, localPath, 'index.html');
}

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const markup = stripNonMarkupBodies(html);
  const rel = path.relative(distDir, file);
  const targets = anchorTargets(markup);

  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  if (!/\blang=["']he["']/i.test(htmlTag) || !/\bdir=["']rtl["']/i.test(htmlTag)) {
    failures.push(`${rel}: <html> missing lang="he" dir="rtl"`);
  }

  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!title || !title[1].trim()) failures.push(`${rel}: empty or missing <title>`);

  for (const m of markup.matchAll(/<img\b[^>]*\s(?:data-)?src=["']([^"']+)["']/gi)) {
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

  for (const m of markup.matchAll(/<a\b[^>]*\bhref=["']([^"']+\.pdf)["']/gi)) {
    const href = m[1];
    if (!href.includes('/posts-pdf/') && !href.includes('/book/')) continue;
    pdfCount += 1;
    if (!href.startsWith(`${BASE}/`)) {
      failures.push(`${rel}: pdf link not base-prefixed: ${href}`);
      continue;
    }
    if (!existsSync(path.join(distDir, href.slice(BASE.length + 1)))) {
      failures.push(`${rel}: pdf file missing in dist: ${href}`);
    }
  }

  for (const m of markup.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (!href || /^(?:mailto:|tel:|javascript:)/i.test(href)) continue;

    if (href.startsWith('#')) {
      let id;
      try {
        id = decodeURIComponent(href.slice(1));
      } catch {
        failures.push(`${rel}: malformed hash target: ${href}`);
        continue;
      }
      if (id && !targets.has(id)) failures.push(`${rel}: same-page hash target missing: ${href}`);
      continue;
    }

    const targetPath = distPathForLocalUrl(href);
    if (!targetPath) continue;
    internalLinkCount += 1;
    if (!existsSync(targetPath)) failures.push(`${rel}: internal link target missing: ${href}`);
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
  `Metadata OK: ${files.length} pages, ${postCount} posts, ${imgCount} image refs, ${pdfCount} pdf links, and ${internalLinkCount} internal links verified.`,
);
