#!/usr/bin/env node
// Dist-side check on the built site. Guards the regressions a passing build
// won't catch on its own:
//   1. every page keeps <html lang="he" dir="rtl"> (RTL is core to this blog)
//   2. every page has a non-empty <title> and meta description
//   3. every local <img> pointing at images/ or gallery/photos/ is base-prefixed
//      via both src and deferred data-src attributes — this is what
//      rewriteImageBase + withBase produce; a miss ships broken images
//   4. each referenced image file actually exists in dist/
//   5. every local archive image has alternative text
//   6. every <a> pointing at posts-pdf/ or book/ is base-prefixed, declares its
//      PDF media type, and the PDF file actually exists in dist/
//   7. every internal archive link resolves to a built page/file, and same-page
//      plus cross-page fragments point at an existing id/name.
//   8. post pages were generated
//   9. social preview metadata covers Open Graph, Twitter cards, and legacy
//      itemprop tags used by common social crawlers.
//  10. links that open a new tab include rel="noopener".
//  11. local archive images carry intrinsic dimensions, limiting layout shifts.
//  12. rendered links do not point visitors at dead Tapuz URLs; Tapuz references
//      belong in archival metadata only.
//  13. every page has a canonical URL for its own built route, and social
//      metadata points at that same canonical URL.
//  14. social preview images are same-origin files that exist in dist/.
//  15. post structured data carries the same description crawlers see in meta tags.
//  16. local video posters and source files resolve to built files.
//  17. head-level rel="prev"/"next" archive navigation resolves to built pages.
//  18. each page advertises a local favicon asset that exists in dist/.
//  19. the search page has an explicit failed-index-load status, not a silent
//      empty-result fallback.
//  20. social preview image dimensions match the actual same-origin image.
//  21. the sitemap discovery link declares its XML media type.
//  22. post JSON-LD URLs match the page canonical URL.
//  23. robots.txt advertises the built sitemap with the canonical site origin.
//  24. every page keeps exactly one skip-to-content link pointing at exactly
//      one focusable main landmark.
//  25. post publish times keep the visible Hebrew time in machine-readable metadata.
//  26. archive cards keep the visible Hebrew publish time in machine-readable
//      <time> metadata too.
//  27. post JSON-LD headlines match the visible post title.
//  28. the client-side search index has one entry per post and every entry links
//      to a built post page.
//  29. the search page announces search-index loading before results arrive.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';
import sharp from 'sharp';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const SITE_ORIGIN = 'https://hayabesartan.com';
// Empty at the apex root; local asset URLs are absolute-rooted (/images/…, /gallery/…).
const BASE = '';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']);

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
let tapuzLinkCount = 0;
let videoAssetCount = 0;
let iconLinkCount = 0;
let socialImageDimensionCount = 0;
let postCardTimeCount = 0;
let postJsonLdHeadlineCount = 0;
let skipMainCount = 0;
let searchIndexEntryCount = 0;
let descriptionCount = 0;
const pageTargets = new Map();

function anchorTargets(html) {
  const targets = new Set();
  for (const m of html.matchAll(/\s(?:id|name)=["']([^"']+)["']/gi)) targets.add(m[1]);
  return targets;
}

function stripNonMarkupBodies(html) {
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
}

function attrValue(tag, attr) {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\s${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return (match?.[1] ?? match?.[2] ?? '').trim();
}

function decodeHtmlAttr(value) {
  return value
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function decodeHtmlText(value) {
  return decodeHtmlAttr(value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
}

function metaTags(markup) {
  const tags = new Map();
  for (const m of markup.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const key = attrValue(tag, 'property') || attrValue(tag, 'name') || attrValue(tag, 'itemprop');
    const content = attrValue(tag, 'content');
    if (!key || !content) continue;
    if (!tags.has(key)) tags.set(key, []);
    tags.get(key).push(content);
  }
  return tags;
}

function linkTags(markup, relName) {
  return [...markup.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((tag) => attrValue(tag, 'rel').toLowerCase().split(/\s+/).includes(relName));
}

function jsonLdObjects(markup, rel) {
  const objects = [];
  for (const m of markup.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      objects.push(JSON.parse(m[1].trim()));
    } catch (error) {
      failures.push(`${rel}: invalid JSON-LD: ${error.message}`);
    }
  }
  return objects;
}

function requireMeta(tags, rel, keys) {
  for (const key of keys) {
    if (!tags.has(key)) failures.push(`${rel}: missing social metadata: ${key}`);
  }
}

function isFile(targetPath) {
  try {
    return statSync(targetPath).isFile();
  } catch {
    return false;
  }
}

function requireLocalAssetUrl(rel, field, rawUrl) {
  if (!rawUrl) return;
  const target = localTargetForUrl(rawUrl);
  if (!target) {
    failures.push(`${rel}: ${field} should be a same-origin asset URL: ${rawUrl}`);
    return;
  }
  // An extensionless URL resolves to a page (…/index.html), not an image — crawlers
  // fetch this URL directly, so a route here ships a broken social preview.
  if (!IMAGE_EXTENSIONS.has(path.extname(target.targetPath).toLowerCase())) {
    failures.push(`${rel}: ${field} should point at an image file: ${rawUrl}`);
    return;
  }
  if (!isFile(target.targetPath)) failures.push(`${rel}: ${field} file missing in dist: ${rawUrl}`);
}

async function requireSocialImageDimensions(rel, rawUrl, widthValue, heightValue) {
  const target = localTargetForUrl(rawUrl);
  if (!target || !isFile(target.targetPath)) return;

  const declaredWidth = Number(widthValue);
  const declaredHeight = Number(heightValue);
  if (!Number.isInteger(declaredWidth) || !Number.isInteger(declaredHeight) || declaredWidth <= 0 || declaredHeight <= 0) {
    failures.push(`${rel}: og:image dimensions should be positive integers: ${rawUrl}`);
    return;
  }

  try {
    const metadata = await sharp(target.targetPath).metadata();
    socialImageDimensionCount += 1;
    if (metadata.width !== declaredWidth || metadata.height !== declaredHeight) {
      failures.push(`${rel}: og:image dimensions ${declaredWidth}x${declaredHeight} do not match ${metadata.width}x${metadata.height}: ${rawUrl}`);
    }
  } catch (error) {
    failures.push(`${rel}: could not read og:image dimensions: ${rawUrl}: ${error.message}`);
  }
}

function requireLocalBuiltFileUrl(rel, field, rawUrl) {
  if (!rawUrl) return;
  const target = localTargetForUrl(rawUrl);
  if (!target) {
    failures.push(`${rel}: ${field} should be a same-origin file URL: ${rawUrl}`);
    return;
  }
  if (!path.extname(new URL(rawUrl, SITE_ORIGIN).pathname)) {
    failures.push(`${rel}: ${field} should point at a file, not a page route: ${rawUrl}`);
    return;
  }
  if (!isFile(target.targetPath)) failures.push(`${rel}: ${field} file missing in dist: ${rawUrl}`);
}

function localTargetForUrl(rawHref) {
  let url;
  try {
    url = new URL(rawHref, SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN) return null;
  } catch {
    return null;
  }

  const urlPath = url.pathname;
  if (!urlPath.startsWith(`${BASE}/`) && urlPath !== BASE) return null;
  const localPath = urlPath.slice(BASE.length).replace(/^\/+/, '');
  const targetPath =
    localPath === ''
      ? path.join(distDir, 'index.html')
      : path.extname(localPath)
        ? path.join(distDir, localPath)
        : path.join(distDir, localPath, 'index.html');
  return { targetPath, hash: url.hash };
}

function decodeHash(hash, rel, href) {
  try {
    return decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    failures.push(`${rel}: malformed hash target: ${href}`);
    return null;
  }
}

function isTapuzUrl(rawHref) {
  try {
    const url = new URL(rawHref, SITE_ORIGIN);
    return url.hostname === 'tapuz.co.il' || url.hostname.endsWith('.tapuz.co.il');
  } catch {
    return false;
  }
}

function visiblePublishTime(text) {
  return text.match(/(\d{1,2}):(\d{2})\s*$/)?.slice(1, 3).join(':') ?? null;
}

for (const file of files) {
  const html = await readFile(file, 'utf8');
  pageTargets.set(file, anchorTargets(stripNonMarkupBodies(html)));
}

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const markup = stripNonMarkupBodies(html);
  const rel = path.relative(distDir, file);
  const targets = anchorTargets(markup);
  const metas = metaTags(markup);
  const canonicalLinks = linkTags(markup, 'canonical');
  const sitemapLinks = linkTags(markup, 'sitemap');
  const iconLinks = linkTags(markup, 'icon');
  const sequenceLinks = [...linkTags(markup, 'prev'), ...linkTags(markup, 'next')];
  let canonicalHref = null;

  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  if (!/\blang=["']he["']/i.test(htmlTag) || !/\bdir=["']rtl["']/i.test(htmlTag)) {
    failures.push(`${rel}: <html> missing lang="he" dir="rtl"`);
  }

  const skipLinks = [...markup.matchAll(/<a\b[^>]*>/gi)].filter((m) => {
    const tag = m[0];
    return attrValue(tag, 'class').split(/\s+/).includes('skip-link') && attrValue(tag, 'href') === '#main';
  });
  const focusableMains = [...markup.matchAll(/<main\b[^>]*>/gi)].filter((m) => (
    attrValue(m[0], 'id') === 'main' && attrValue(m[0], 'tabindex') === '-1'
  ));
  if (skipLinks.length !== 1) {
    failures.push(`${rel}: expected exactly one skip-to-content link to #main, found ${skipLinks.length}`);
  }
  if (focusableMains.length !== 1) {
    failures.push(`${rel}: expected exactly one focusable main landmark, found ${focusableMains.length}`);
  }
  if (skipLinks.length === 1 && focusableMains.length === 1) {
    skipMainCount += 1;
  }

  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!title || !title[1].trim()) failures.push(`${rel}: empty or missing <title>`);
  const hasDescription = metas.has('description');
  if (!hasDescription) {
    failures.push(`${rel}: empty or missing meta description`);
  } else {
    descriptionCount += 1;
  }

  if (canonicalLinks.length !== 1) {
    failures.push(`${rel}: expected exactly one canonical link, found ${canonicalLinks.length}`);
  } else {
    const href = attrValue(canonicalLinks[0], 'href');
    canonicalHref = href;
    let canonicalUrl = null;
    try {
      canonicalUrl = new URL(href);
    } catch {
      failures.push(`${rel}: canonical URL is not absolute: ${href}`);
    }
    if (canonicalUrl) {
      if (canonicalUrl.origin !== SITE_ORIGIN) failures.push(`${rel}: canonical URL has unexpected origin: ${href}`);
      if (canonicalUrl.search || canonicalUrl.hash) failures.push(`${rel}: canonical URL should not include search or hash: ${href}`);
      const target = localTargetForUrl(canonicalUrl.href);
      if (!target || path.resolve(target.targetPath) !== path.resolve(file)) {
        failures.push(`${rel}: canonical URL does not resolve to this page: ${href}`);
      }
      if (metas.get('og:url')?.[0] !== href) {
        failures.push(`${rel}: og:url does not match canonical URL`);
      }
    }
  }

  if (sitemapLinks.length < 1) {
    failures.push(`${rel}: missing sitemap link`);
  } else {
    for (const tag of sitemapLinks) {
      const href = attrValue(tag, 'href');
      const type = attrValue(tag, 'type').toLowerCase();
      if (type !== 'application/xml') failures.push(`${rel}: sitemap link should declare type="application/xml": ${href}`);
      const target = localTargetForUrl(href);
      if (!target || !existsSync(target.targetPath)) failures.push(`${rel}: sitemap link target missing: ${href}`);
    }
  }

  if (iconLinks.length < 1) {
    failures.push(`${rel}: missing favicon link`);
  } else {
    for (const tag of iconLinks) {
      iconLinkCount += 1;
      requireLocalAssetUrl(rel, 'favicon link', attrValue(tag, 'href'));
    }
  }

  if (rel === path.join('tags', 'index.html') && !html.includes('החיפוש אינו זמין כרגע')) {
    failures.push(`${rel}: missing explicit search-index failure status`);
  }
  if (rel === path.join('tags', 'index.html') && !html.includes('טוען את אינדקס החיפוש')) {
    failures.push(`${rel}: missing explicit search-index loading status`);
  }

  for (const tag of sequenceLinks) {
    const href = attrValue(tag, 'href');
    const relValues = attrValue(tag, 'rel').toLowerCase().split(/\s+/).filter(Boolean);
    const relation = relValues.includes('prev') ? 'prev' : 'next';
    const target = localTargetForUrl(href);
    if (!target) {
      failures.push(`${rel}: rel="${relation}" link should be same-origin: ${href}`);
      continue;
    }
    if (target.hash) failures.push(`${rel}: rel="${relation}" link should not include a fragment: ${href}`);
    if (path.extname(target.targetPath) !== '.html') {
      failures.push(`${rel}: rel="${relation}" link should point at a page route: ${href}`);
      continue;
    }
    if (!existsSync(target.targetPath)) failures.push(`${rel}: rel="${relation}" link target missing: ${href}`);
  }

  requireMeta(metas, rel, [
    'og:title',
    'og:type',
    'og:site_name',
    'og:locale',
    'og:url',
    'og:image',
    'og:image:secure_url',
    'og:image:type',
    'og:image:width',
    'og:image:height',
    'og:image:alt',
    'twitter:card',
    'twitter:title',
    'twitter:image',
    'twitter:image:alt',
    'name',
    'image',
  ]);
  requireMeta(metas, rel, ['og:description', 'twitter:description', 'description']);
  if (metas.get('twitter:card')?.[0] !== 'summary_large_image') {
    failures.push(`${rel}: twitter:card should be summary_large_image`);
  }
  // Every value matters, not just the first: a crawler may pick any repeated tag.
  const ogImages = metas.get('og:image') ?? [];
  const twitterImages = metas.get('twitter:image') ?? [];
  if (ogImages.length !== twitterImages.length || ogImages.some((url, i) => url !== twitterImages[i])) {
    failures.push(`${rel}: og:image and twitter:image differ`);
  }
  const ogImageWidths = metas.get('og:image:width') ?? [];
  const ogImageHeights = metas.get('og:image:height') ?? [];
  if (ogImages.length !== ogImageWidths.length || ogImages.length !== ogImageHeights.length) {
    failures.push(`${rel}: og:image dimensions count does not match og:image count`);
  }
  for (let i = 0; i < ogImages.length; i += 1) {
    await requireSocialImageDimensions(rel, ogImages[i], ogImageWidths[i], ogImageHeights[i]);
  }
  for (const [field, key] of [
    ['og:image', 'og:image'],
    ['og:image:secure_url', 'og:image:secure_url'],
    ['twitter:image', 'twitter:image'],
    ['itemprop image', 'image'],
  ]) {
    for (const rawUrl of metas.get(key) ?? []) requireLocalAssetUrl(rel, field, rawUrl);
  }
  if (metas.get('og:type')?.[0] === 'article') {
    requireMeta(metas, rel, ['article:published_time', 'article:author', 'article:tag']);
    const articlePublishedTime = metas.get('article:published_time')?.[0] ?? '';
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(articlePublishedTime)) {
      failures.push(`${rel}: article:published_time should include the visible publish time: ${articlePublishedTime}`);
    }
    const visibleTimeTag = markup.match(/<time\b[^>]*class=["'][^"']*\beyebrow\b[^"']*["'][^>]*>/i)?.[0];
    if (!visibleTimeTag) {
      failures.push(`${rel}: missing visible post publish time`);
    } else if (attrValue(visibleTimeTag, 'datetime') !== articlePublishedTime) {
      failures.push(`${rel}: visible publish datetime does not match article:published_time`);
    }
    const blogPosting = jsonLdObjects(html, rel).find((data) => data?.['@type'] === 'BlogPosting');
    if (!blogPosting) {
      failures.push(`${rel}: missing BlogPosting JSON-LD`);
    } else {
      const visiblePostTitle = markup.match(/<h1\b[^>]*class=["'][^"']*\bpost__title\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
      if (!visiblePostTitle) {
        failures.push(`${rel}: missing visible post title`);
      } else {
        postJsonLdHeadlineCount += 1;
        const headline = decodeHtmlText(visiblePostTitle[1]);
        if (blogPosting.headline !== headline) {
          failures.push(`${rel}: BlogPosting JSON-LD headline does not match visible post title`);
        }
      }
      if (blogPosting.description !== decodeHtmlAttr(metas.get('description')?.[0] ?? '')) {
        failures.push(`${rel}: BlogPosting JSON-LD description does not match meta description`);
      } else if (canonicalHref && blogPosting.url !== canonicalHref) {
        failures.push(`${rel}: BlogPosting JSON-LD URL does not match canonical URL`);
      } else if (blogPosting.datePublished !== articlePublishedTime) {
        failures.push(`${rel}: BlogPosting JSON-LD datePublished does not match article:published_time`);
      }
    }
  }

  for (const m of markup.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const srcs = [attrValue(tag, 'src'), attrValue(tag, 'data-src')].filter(Boolean);
    const localSrcs = srcs.filter((src) => /(?:^|\/|\.\.\/)(?:images|gallery\/(?:photos|thumbs))\//.test(src));
    if (localSrcs.length === 0) continue;
    if (!attrValue(tag, 'alt')) failures.push(`${rel}: local image missing alt text: ${localSrcs[0]}`);
    for (const src of localSrcs) {
      imgCount += 1;
      if ((src.includes('/images/') || src.includes('/gallery/')) && (!attrValue(tag, 'width') || !attrValue(tag, 'height'))) {
        failures.push(`${rel}: local image missing intrinsic dimensions: ${src}`);
      }
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

  for (const m of markup.matchAll(/<time\b[^>]*class=["'][^"']*\bpost-card__date\b[^"']*["'][^>]*>([\s\S]*?)<\/time>/gi)) {
    postCardTimeCount += 1;
    const tag = m[0];
    const dateTime = attrValue(tag, 'datetime');
    const machineTime = dateTime.match(/^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})$/)?.slice(1, 3).join(':') ?? null;
    const visibleTime = visiblePublishTime(m[1].replace(/<[^>]*>/g, ''));
    if (!machineTime) {
      failures.push(`${rel}: post card datetime should include date and visible publish time: ${dateTime}`);
    } else if (visibleTime && machineTime !== visibleTime.padStart(5, '0')) {
      failures.push(`${rel}: post card datetime ${dateTime} does not match visible time ${visibleTime}`);
    }
  }

  for (const m of markup.matchAll(/<a\b[^>]*\bhref=["']([^"']+\.pdf)["'][^>]*>/gi)) {
    const tag = m[0];
    const href = m[1];
    if (!href.includes('/posts-pdf/') && !href.includes('/book/')) continue;
    pdfCount += 1;
    if (!href.startsWith(`${BASE}/`)) {
      failures.push(`${rel}: pdf link not base-prefixed: ${href}`);
      continue;
    }
    if (attrValue(tag, 'type') !== 'application/pdf') {
      failures.push(`${rel}: pdf link should declare type="application/pdf": ${href}`);
    }
    if (!existsSync(path.join(distDir, href.slice(BASE.length + 1)))) {
      failures.push(`${rel}: pdf file missing in dist: ${href}`);
    }
  }

  for (const m of markup.matchAll(/<video\b[^>]*>/gi)) {
    const poster = attrValue(m[0], 'poster');
    if (!poster) continue;
    videoAssetCount += 1;
    requireLocalAssetUrl(rel, 'video poster', poster);
  }

  for (const m of markup.matchAll(/<source\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const src = m[1];
    if (!/(?:^|\/)video\//.test(src)) continue;
    videoAssetCount += 1;
    requireLocalBuiltFileUrl(rel, 'video source', src);
  }

  for (const m of markup.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    const tag = m[0];
    const href = m[1];
    if (!href || /^(?:mailto:|tel:|javascript:)/i.test(href)) continue;

    if (isTapuzUrl(href)) {
      tapuzLinkCount += 1;
      failures.push(`${rel}: public link points at dead Tapuz URL: ${href}`);
    }

    if (attrValue(tag, 'target').toLowerCase() === '_blank') {
      const relValues = attrValue(tag, 'rel').toLowerCase().split(/\s+/).filter(Boolean);
      if (!relValues.includes('noopener')) failures.push(`${rel}: target="_blank" link missing rel="noopener": ${href}`);
    }

    if (href.startsWith('#')) {
      const id = decodeHash(href, rel, href);
      if (id && !targets.has(id)) failures.push(`${rel}: same-page hash target missing: ${href}`);
      continue;
    }

    const target = localTargetForUrl(href);
    if (!target) continue;
    internalLinkCount += 1;
    const { targetPath, hash } = target;
    if (!existsSync(targetPath)) failures.push(`${rel}: internal link target missing: ${href}`);
    if (hash && existsSync(targetPath) && path.extname(targetPath) === '.html') {
      const id = decodeHash(hash, rel, href);
      if (id && !pageTargets.get(targetPath)?.has(id)) {
        failures.push(`${rel}: cross-page hash target missing: ${href}`);
      }
    }
  }
}

const postsDir = path.join(distDir, 'posts');
const postCount = existsSync(postsDir)
  ? (await readdir(postsDir, { withFileTypes: true })).filter((d) => d.isDirectory()).length
  : 0;
if (postCount < 1) failures.push('no post pages generated under dist/posts/');
if (postCardTimeCount < 1) failures.push('no archive post-card publish times found');
if (postJsonLdHeadlineCount !== postCount) {
  failures.push(`expected ${postCount} post JSON-LD headline checks, found ${postJsonLdHeadlineCount}`);
}

const searchIndexPath = path.join(distDir, 'search-index.json');
if (!existsSync(searchIndexPath)) {
  failures.push('search-index.json missing from dist');
} else {
  try {
    const searchIndex = JSON.parse(await readFile(searchIndexPath, 'utf8'));
    if (!Array.isArray(searchIndex)) {
      failures.push('search-index.json should contain an array');
    } else {
      searchIndexEntryCount = searchIndex.length;
      if (searchIndexEntryCount !== postCount) {
        failures.push(`search-index.json expected ${postCount} entries, found ${searchIndexEntryCount}`);
      }

      const seenUrls = new Set();
      for (const [i, entry] of searchIndex.entries()) {
        const label = `search-index.json[${i}]`;
        if (!entry || typeof entry !== 'object') {
          failures.push(`${label}: entry should be an object`);
          continue;
        }

        for (const field of ['title', 'date', 'url', 'excerpt', 'text']) {
          if (typeof entry[field] !== 'string' || !entry[field].trim()) {
            failures.push(`${label}: ${field} should be a non-empty string`);
          }
        }

        if (typeof entry.url === 'string') {
          if (seenUrls.has(entry.url)) failures.push(`${label}: duplicate search result URL: ${entry.url}`);
          seenUrls.add(entry.url);

          const target = localTargetForUrl(entry.url);
          if (!target) {
            failures.push(`${label}: search result URL should be same-origin: ${entry.url}`);
          } else if (path.extname(target.targetPath) !== '.html' || !target.targetPath.startsWith(postsDir + path.sep)) {
            failures.push(`${label}: search result URL should point at a post page: ${entry.url}`);
          } else if (!existsSync(target.targetPath)) {
            failures.push(`${label}: search result URL target missing: ${entry.url}`);
          }
        }
      }
    }
  } catch (error) {
    failures.push(`search-index.json is invalid JSON: ${error.message}`);
  }
}

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

const robotsPath = path.join(distDir, 'robots.txt');
if (!existsSync(robotsPath)) {
  failures.push('robots.txt missing from dist');
} else {
  const robots = await readFile(robotsPath, 'utf8');
  const sitemapUrl = `${SITE_ORIGIN}/sitemap-index.xml`;
  if (!new RegExp(`^Sitemap:\\s*${sitemapUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(robots)) {
    failures.push(`robots.txt missing canonical sitemap directive: ${sitemapUrl}`);
  }
}

if (failures.length > 0) {
  console.error('Site metadata check failed:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log(
  `Metadata OK: ${files.length} pages, ${descriptionCount} meta descriptions, ${postCount} posts, ${imgCount} image refs, ${pdfCount} pdf links, ${videoAssetCount} video assets, ${iconLinkCount} favicon links, ${socialImageDimensionCount} social image dimensions, ${postCardTimeCount} archive card times, ${postJsonLdHeadlineCount} post JSON-LD headlines, ${skipMainCount} skip/main landmarks, ${searchIndexEntryCount} search index entries, ${internalLinkCount} internal links, and ${tapuzLinkCount} Tapuz outbound links verified.`,
);
