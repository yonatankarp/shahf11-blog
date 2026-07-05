# Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all fixes from the 2026-07-05 five-agent review: sharing metadata, gallery performance + accessibility, post-image pipeline, hero portrait, same-origin PDFs, search/text cleanups, CSS polish, CI parity.

**Architecture:** Astro 7 static site, base path `/shahf11-blog`, deployed to GitHub Pages. All images live in `public/` (copied from repo-root `images/` and `gallery/photos/` by `scripts/copy-images.mjs` before every build/dev). The copy script grows a sharp resize pipeline; a rehype plugin decorates post-body `<img>`; the gallery page gets a rebuilt carousel.

**Tech Stack:** Astro 7, sharp, @astrojs/sitemap, js-yaml 5, plain inline JS (no framework).

## Global Constraints

- Site is Hebrew RTL (`lang="he" dir="rtl"`); all user-facing copy in Hebrew.
- Base path `/shahf11-blog` — every internal href/src goes through `withBase()` from `src/lib/url.ts` (exception: rehype plugin hardcodes the BASE constant; keep that pattern).
- Single committed light theme; oldest-first post order; Gveret Levin display font — deliberate, do not change.
- No new client-side frameworks; keep inline `<script>` patterns.
- Never invent content: no fabricated captions, alt texts describing unverifiable people, or transcriptions. (User explicitly chose to SKIP preface transcription and video captions.)
- Verification command for the whole site: `npm run check` (runs check:blog-assets, check:gallery-assets, build, check:site-metadata).
- There is no unit-test suite; each task's "test" is a check-script or a grep against `dist/`. Where a check script guards the behavior, update the check script in the same task.
- Commit after each task with a conventional-commit message ending in the Co-Authored-By line from repo convention.

## File map

| File | Tasks touching it |
|---|---|
| `package.json` | 1 |
| `astro.config.mjs` | 2 |
| `src/layouts/Base.astro` | 2, 6, 9 |
| `public/favicon.svg`, `public/robots.txt` | 2 |
| `src/styles/global.css` | 2, 5, 9 |
| `src/pages/posts/[entryId].astro` | 3, 6, 7 |
| `src/pages/blog/[...page].astro` | 3, 8 |
| `src/pages/tags/index.astro` | 3, 8 |
| `src/pages/about.astro`, `src/pages/index.astro` | 3, 4 |
| `public/haya.jpg` | 4 |
| `scripts/copy-images.mjs` | 5 |
| `src/pages/gallery.astro` | 5 |
| `scripts/check-gallery-assets.mjs`, `scripts/check-site-metadata.mjs` | 5 |
| `src/lib/rehype-image-base.mjs`, `src/lib/rehype-drop-title.mjs` | 6 |
| `book/`, `posts-pdf/` → `public/` | 7 |
| `src/pages/book.astro`, `README.md` | 7 |
| `src/lib/posts.ts`, `src/lib/tags.ts`, `src/pages/search-index.json.ts` | 8 |
| `src/pages/tags/[slug]/[...page].astro` | 8 |
| `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` | 10 |

---

### Task 1: Dependencies

**Files:**
- Modify: `package.json` (via npm commands, not hand-editing)

**Interfaces:**
- Produces: `sharp` (used by Task 5), `@astrojs/sitemap` (Task 2). Removes `@fontsource/secular-one` (its import is deleted in Task 2).

- [ ] **Step 1: Install/remove packages**

```bash
npm install sharp @astrojs/sitemap
npm uninstall @fontsource/secular-one
```

- [ ] **Step 2: Verify install**

Run: `node -e "import('sharp').then(() => console.log('sharp ok'))" && node -e "import('@astrojs/sitemap').then(() => console.log('sitemap ok'))"`
Expected: both `ok` lines.

- [ ] **Step 3: Verify the build still passes without secular-one**

`src/layouts/Base.astro:4` still imports it — expected to FAIL now. Do NOT fix here (Task 2 removes the import); instead just confirm the failure is the expected one:
Run: `npm run build 2>&1 | tail -5`
Expected: error mentioning `@fontsource/secular-one`. If the build passes, secular-one was not actually removed — investigate.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add sharp + @astrojs/sitemap, drop unused secular-one font"
```

---

### Task 2: Head metadata block (og/canonical/favicon/sitemap/preloads)

**Files:**
- Modify: `src/layouts/Base.astro`
- Modify: `astro.config.mjs`
- Modify: `src/styles/global.css:18` (--disp font chain)
- Create: `public/favicon.svg`
- Create: `public/robots.txt`

**Interfaces:**
- Produces: `Base.astro` props `{ title, description, wide, ogType = 'website', ogImage }` and a named slot `head`. Task 3 passes `ogType="article"` and uses `slot="head"` for JSON-LD.

- [ ] **Step 1: Add sitemap integration**

In `astro.config.mjs`, add the import and `integrations`:

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { rewriteImageBase } from './src/lib/rehype-image-base.mjs';
import { dropTitleH1 } from './src/lib/rehype-drop-title.mjs';

export default defineConfig({
  site: 'https://yonatankarp.com',
  base: '/shahf11-blog',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  // Astro 7 defaults to the Sätteri processor; opt into the unified processor
  // explicitly so our rehype plugin runs (replaces the deprecated markdown.rehypePlugins).
  markdown: { processor: unified({ rehypePlugins: [rewriteImageBase, dropTitleH1] }) },
});
```

- [ ] **Step 2: Create favicon and robots.txt**

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#f7efe3"/><text x="32" y="47" font-family="Georgia, 'Frank Ruhl Libre', serif" font-size="42" text-anchor="middle" fill="#c5384a">ח</text></svg>
```

`public/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://yonatankarp.com/shahf11-blog/sitemap-index.xml
```

- [ ] **Step 3: Rewrite Base.astro frontmatter + head**

Replace the frontmatter imports/props (`src/layouts/Base.astro:1-9`) with:

```astro
---
import '@fontsource-variable/frank-ruhl-libre';
import '@fontsource-variable/assistant';
import '@fontsource/gveret-levin/400.css';
import '@fontsource/heebo/700.css';
import '../styles/global.css';
import frankHebrewWoff2 from '@fontsource-variable/frank-ruhl-libre/files/frank-ruhl-libre-hebrew-wght-normal.woff2?url';
import gveretHebrewWoff2 from '@fontsource/gveret-levin/files/gveret-levin-hebrew-400-normal.woff2?url';
import { withBase } from '../lib/url';
const { title, description, wide = false, ogType = 'website', ogImage } = Astro.props;
const path = Astro.url.pathname.replace(/\/$/, '');
// Canonical/og URLs must be absolute — WhatsApp/Facebook won't fetch root-relative ones.
const canonicalPath = Astro.url.pathname.endsWith('/') ? Astro.url.pathname : `${Astro.url.pathname}/`;
const canonical = new URL(canonicalPath, Astro.site);
const ogImageUrl = new URL(ogImage ?? withBase('haya.jpg'), Astro.site);
```

(the secular-one import at old line 4 is gone; the `isActive`/`nav` block stays as-is — Task 6 touches it.)

Replace the `<head>` (`src/layouts/Base.astro:28-33`) with:

```astro
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  {description && <meta name="description" content={description} />}
  <link rel="icon" type="image/svg+xml" href={withBase('favicon.svg')} />
  <meta name="theme-color" content="#f7efe3" />
  <link rel="canonical" href={canonical} />
  <link rel="sitemap" href={withBase('sitemap-index.xml')} />
  <link rel="preload" as="font" type="font/woff2" href={frankHebrewWoff2} crossorigin />
  <link rel="preload" as="font" type="font/woff2" href={gveretHebrewWoff2} crossorigin />
  <meta property="og:title" content={title} />
  {description && <meta property="og:description" content={description} />}
  <meta property="og:type" content={ogType} />
  <meta property="og:site_name" content="חיה בסרט(ן)" />
  <meta property="og:locale" content="he_IL" />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content={ogImageUrl} />
  <meta name="twitter:card" content="summary_large_image" />
  <slot name="head" />
</head>
```

- [ ] **Step 4: Drop Secular One from the CSS font chain**

`src/styles/global.css:18`:
```css
  --disp:  'Gveret Levin', var(--serif);
```

- [ ] **Step 5: Build and verify**

Run: `npm run build && grep -o 'og:image[^>]*' dist/index.html && grep -o 'rel="canonical"[^>]*' dist/posts/1214120/index.html && ls dist/sitemap-index.xml dist/robots.txt dist/favicon.svg && grep -c 'rel="preload" as="font"' dist/index.html && ! grep -ri 'secular' dist/_astro/*.css`
Expected: og:image content is `https://yonatankarp.com/shahf11-blog/haya.jpg`; canonical is an absolute `https://yonatankarp.com/shahf11-blog/posts/1214120/` URL; sitemap/robots/favicon exist; preload count = 2; no secular hits (the final `!` grep exits 0 because nothing matches).
Note: post dist dirs are named by entryId (e.g. `dist/posts/1214120/`) — `ls dist/posts | head` first if unsure.

- [ ] **Step 6: Run full check**

Run: `npm run check`
Expected: all four stages pass.

- [ ] **Step 7: Commit**

```bash
git add astro.config.mjs src/layouts/Base.astro src/styles/global.css public/favicon.svg public/robots.txt
git commit -m "feat: og/canonical/favicon/sitemap/font-preload head block"
```

---

### Task 3: Per-page descriptions, titles, JSON-LD

**Files:**
- Modify: `src/pages/posts/[entryId].astro`
- Modify: `src/pages/blog/[...page].astro`
- Modify: `src/pages/tags/index.astro:15`
- Modify: `src/pages/about.astro:4`
- Modify: `src/pages/index.astro:25-28`
- Modify: `src/pages/tags/[slug]/[...page].astro` (read it first; add description if missing)
- Modify: `src/pages/letters.astro` (read it first; add description if missing)

**Interfaces:**
- Consumes: Base props `ogType`, slot `head` (Task 2); `excerpt` from `src/lib/posts.ts:20`.

- [ ] **Step 1: Post pages — description + article og + JSON-LD**

In `src/pages/posts/[entryId].astro`, extend the imports/frontmatter (after line 15):

```astro
import { getAllPosts, getAdjacent, excerpt } from '../../lib/posts';
```
```astro
const description = excerpt(post.body ?? '');
const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.data.title,
  datePublished: post.data.date.toISOString().slice(0, 10),
  inLanguage: 'he',
  author: { '@type': 'Person', name: 'חיה קרפ-צור' },
  url: new URL(`${Astro.url.pathname.replace(/\/$/, '')}/`, Astro.site).href,
});
```

Change the Base opening tag (line 22) and add the head-slot script directly inside `<Base>`:

```astro
<Base title={`${post.data.title} — חיה בסרט(ן)`} description={description} ogType="article">
  <script type="application/ld+json" set:html={jsonLd} is:inline slot="head" />
```

- [ ] **Step 2: Blog pagination — unique titles + description**

`src/pages/blog/[...page].astro:15`:
```astro
<Base
  title={page.currentPage > 1 ? `הבלוג · עמוד ${page.currentPage} — חיה בסרט(ן)` : 'הבלוג — חיה בסרט(ן)'}
  description={`כל ${page.total} הרשומות של הבלוג, מהישנה לחדשה.`}
>
```

- [ ] **Step 3: Remaining page descriptions**

`src/pages/tags/index.astro:15`:
```astro
<Base title="חיפוש ותגיות — חיה בסרט(ן)" description="חיפוש בכל רשומות הבלוג, ועיון לפי בני משפחה ונושאים.">
```

`src/pages/about.astro:4`:
```astro
<Base title="על הבלוג — חיה בסרט(ן)" description="איך שוחזר ארכיון הבלוג 'חיה בסרט(ן)' מתוך סריקות, ומה מקור התכנים.">
```

Read `src/pages/tags/[slug]/[...page].astro` and `src/pages/letters.astro`; if their `<Base` tag lacks `description`, add one derived from the page (tag pages: `` description={`רשומות מהבלוג עם התגית ${tag.label}.`} `` — adjust to the actual variable name in the file; letters: a one-line Hebrew description of the family letters page). If a title there lacks the `— חיה בסרט(ן)` suffix, add it. For paginated tag pages, interpolate `· עמוד ${page.currentPage}` into the title when `page.currentPage > 1`, same pattern as Step 2.

- [ ] **Step 4: Homepage JSON-LD**

In `src/pages/index.astro` frontmatter add:

```astro
const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'חיה בסרט(ן)',
  url: new URL(withBase(''), Astro.site).href,
  inLanguage: 'he',
  author: { '@type': 'Person', name: 'חיה קרפ-צור' },
});
```

and inside `<Base ...>` (first child):
```astro
  <script type="application/ld+json" set:html={jsonLd} is:inline slot="head" />
```

- [ ] **Step 5: Build and verify**

Run: `npm run build && grep -o 'application/ld+json' dist/index.html && grep -c 'meta name="description"' dist/posts/1214120/index.html && grep -o '<title>[^<]*</title>' dist/blog/2/index.html`
Expected: ld+json present on home; description count = 1 on the post; blog page 2 title contains `עמוד 2`.
Then: `node -e "const fs=require('fs');const posts=fs.readdirSync('dist/posts');let miss=0;for(const p of posts){const h=fs.readFileSync('dist/posts/'+p+'/index.html','utf8');if(!h.includes('meta name=\"description\"'))miss++;}console.log(miss+' posts missing description of '+posts.length)"`
Expected: `0 posts missing description of 182`.

- [ ] **Step 6: Run full check, commit**

Run: `npm run check` — all pass.
```bash
git add src/pages
git commit -m "feat: per-page descriptions, unique paginated titles, JSON-LD"
```

---

### Task 4: Hero portrait swap + video decoupling

**Files:**
- Modify: `public/haya.jpg` (binary replace)
- Modify: `src/pages/index.astro:31,51`

**Interfaces:**
- Consumes: Task 2's default `ogImage` (`haya.jpg`) — replacing the file upgrades the og:image everywhere automatically.

- [ ] **Step 1: Replace the hero photo**

The user chose `gallery/photos/haya-gallery-055.jpg` (a warm 640×480 portrait of Haya with a child). Copy from the repo-root source dir (NOT `public/gallery/` — that's generated):

```bash
cp gallery/photos/haya-gallery-055.jpg public/haya.jpg
```

Note: `public/haya.jpg` is a tracked file and copy-images.mjs does not touch it. The photo also stays in the gallery — duplication is fine.

- [ ] **Step 2: Fix hero img attributes**

`src/pages/index.astro:31`:
```astro
    {heroPhoto && <img class="home-hero__photo" src={heroPhoto} alt="חיה, בתמונה משפחתית" width="640" height="480" />}
```
(Real dimensions of the new file; verify with `node -e "import('sharp').then(async s=>console.log(await s.default('public/haya.jpg').metadata()))"` and use the actual width/height it prints.)

- [ ] **Step 3: Decouple the video poster + give the video a name**

`src/pages/index.astro:51` — remove the `poster` attribute (the review found the same image repeating twice in one scroll; with `preload="metadata"` browsers show the first frame) and add an accessible name:

```astro
      <video class="film__video" controls preload="metadata" aria-label="״חיה בסרט(ן)״ — סרט גמר, יוני 2009">
```

- [ ] **Step 4: Update the stale comment**

`src/pages/index.astro:18-20` — the comment block says "Until then the hero stays purely typographic"; replace with:
```js
// A portrait of Haya for the hero (public/haya.jpg — swap the file to change it, no code change).
```

- [ ] **Step 5: Build, eyeball, commit**

Run: `npm run build && grep -o 'home-hero__photo[^>]*' dist/index.html && ! grep -o 'poster=' dist/index.html`
Expected: hero img with new alt/width/height; no poster attribute.
```bash
git add public/haya.jpg src/pages/index.astro
git commit -m "feat: real portrait for the homepage hero, decouple video poster"
```

---

### Task 5: Gallery overhaul (resize pipeline + carousel a11y/perf)

**Files:**
- Modify: `scripts/copy-images.mjs` (full rewrite)
- Modify: `src/pages/gallery.astro` (carousel/grid/lightbox markup + script)
- Modify: `src/styles/global.css` (carousel section ~lines 273-299 + shared button selector ~287)
- Modify: `scripts/check-gallery-assets.mjs:18-23`
- Modify: `scripts/check-site-metadata.mjs:51-63,72-76`
- Modify: `.gitignore` (verify generated dirs are ignored; add `public/gallery/thumbs` and `public/images-dimensions.json` alongside the existing entries for `public/images` / `public/gallery/photos` — read `.gitignore` first)

**Interfaces:**
- Produces: `public/gallery/thumbs/<same-filename>` (480px wide) for carousel+grid; `public/gallery/photos/<same-filename>` now capped at 1600px (lightbox); `public/images/*` capped at 1600px; `public/images-dimensions.json` (`{ "<filename>": { "width": N, "height": N } }`) consumed by Task 6's rehype plugin.

- [ ] **Step 1: Rewrite scripts/copy-images.mjs**

```js
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
    if (!srcNames.includes(name)) await rm(path.join(destDir, name), { recursive: true });
  }
  let converted = 0;
  for (const name of srcNames) {
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
const a = await syncResized('images', 'public/images', DISPLAY_MAX, dims);
const b = await syncResized('gallery/photos', 'public/gallery/photos', DISPLAY_MAX, null);
const c = await syncResized('gallery/photos', 'public/gallery/thumbs', THUMB_MAX, null);
await writeFile('public/images-dimensions.json', JSON.stringify(dims));
console.log(`images -> public/images (${a} converted), gallery -> photos (${b}) + thumbs (${c})`);
```

- [ ] **Step 2: Run it and measure**

Run: `npm run copy:images && du -sh public/gallery/photos public/gallery/thumbs public/images && node -e "const d=require('./public/images-dimensions.json');console.log(Object.keys(d).length,'dimension entries')"`
Expected: photos dir shrinks from ~45M to well under 15M; thumbs a few MB; dimensions entries ≈ number of files in `images/`. Run it twice — second run should print `0 converted` everywhere (incremental skip works) and be fast.

- [ ] **Step 3: Rebuild gallery.astro carousel/grid/lightbox**

Replace the carousel section, grid, and script in `src/pages/gallery.astro` (keep the frontmatter and empty-state as-is). Key changes: slides use the 1600px-capped `photos/` URL but only slide 0 has a real `src` (others `data-src`, hydrated by JS on activation — this is what actually defers 75 image fetches, and the active slide stays sharp in the ~46rem stage); the grid uses 480px `thumbs/`; indexed accessible names; pause/play toggle; `showModal` guard; the lightbox reuses the same `photos/` URL, so it's already cached when opened from the carousel.

```astro
        <section class="gallery-carousel" aria-label="תמונות נבחרות" data-gallery-carousel>
          <button class="gallery-carousel__nav gallery-carousel__nav--prev" type="button" data-gallery-prev aria-label="התמונה הקודמת">‹</button>
          <div class="gallery-carousel__track">
            {photos.map((p, index) => (
              <button class:list={['gallery-carousel__slide', { 'is-active': index === 0 }]} type="button" data-gallery-index={index} aria-label={`פתחו תמונה ${index + 1} מתוך ${photos.length} במסך מלא`}>
                <img
                  src={index === 0 ? withBase(`gallery/photos/${p.file}`) : undefined}
                  data-src={index === 0 ? undefined : withBase(`gallery/photos/${p.file}`)}
                  alt={p.alt ?? p.caption ?? ''}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </button>
            ))}
          </div>
          <button class="gallery-carousel__nav gallery-carousel__nav--next" type="button" data-gallery-next aria-label="התמונה הבאה">›</button>
          <button class="gallery-carousel__toggle" type="button" data-gallery-toggle aria-pressed="false" aria-label="השהיית התחלופה האוטומטית">⏸</button>
        </section>

        <div class="gallery-grid">
          {photos.map((p, index) => (
            <figure>
              <button type="button" class="gallery-thumb" data-gallery-index={index} aria-label={`פתחו תמונה ${index + 1} מתוך ${photos.length} במסך מלא`}>
                <img src={withBase(`gallery/thumbs/${p.file}`)} alt={p.alt ?? p.caption ?? ''} loading="lazy" decoding="async" />
              </button>
              {p.caption && <figcaption>{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
```

(dialog markup unchanged.)

Replace the `<script define:vars>` block with:

```astro
        <script define:vars={{ photos: photos.map((p) => ({ full: withBase(`gallery/photos/${p.file}`), alt: p.alt ?? p.caption ?? '', caption: p.caption ?? '' })) }}>
          const carousel = document.querySelector('[data-gallery-carousel]');
          const slides = [...document.querySelectorAll('[data-gallery-carousel] [data-gallery-index]')];
          const openers = [...document.querySelectorAll('[data-gallery-index]')];
          const prevButton = document.querySelector('[data-gallery-prev]');
          const nextButton = document.querySelector('[data-gallery-next]');
          const toggleButton = document.querySelector('[data-gallery-toggle]');
          const lightbox = document.querySelector('[data-gallery-lightbox]');
          const lightboxImage = document.querySelector('[data-lightbox-image]');
          const lightboxCaption = document.querySelector('[data-lightbox-caption]');
          const lightboxPrev = document.querySelector('[data-lightbox-prev]');
          const lightboxNext = document.querySelector('[data-lightbox-next]');
          const closeButton = document.querySelector('[data-gallery-close]');
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          let current = 0;
          let timer;
          let paused = prefersReducedMotion;

          const normalize = (index) => (index + photos.length) % photos.length;

          const hydrate = (index) => {
            const img = slides[normalize(index)]?.querySelector('img');
            if (img && !img.src && img.dataset.src) img.src = img.dataset.src;
          };

          const showSlide = (index) => {
            current = normalize(index);
            hydrate(current);
            hydrate(current + 1); // prefetch the next slide
            slides.forEach((slide, slideIndex) => {
              slide.classList.toggle('is-active', slideIndex === current);
            });
          };

          const move = (step) => showSlide(current + step);

          const stop = () => {
            if (timer) window.clearInterval(timer);
            timer = undefined;
          };

          const start = () => {
            if (paused || photos.length < 2) return;
            stop();
            timer = window.setInterval(() => move(1), 5000);
          };

          const updateToggle = () => {
            toggleButton.setAttribute('aria-pressed', String(paused));
            toggleButton.textContent = paused ? '▶' : '⏸';
            toggleButton.setAttribute('aria-label', paused ? 'הפעלת התחלופה האוטומטית' : 'השהיית התחלופה האוטומטית');
          };

          const openLightbox = (index) => {
            current = normalize(index);
            const photo = photos[current];
            lightboxImage.src = photo.full;
            lightboxImage.alt = photo.alt;
            lightboxCaption.textContent = photo.caption;
            lightboxCaption.hidden = !photo.caption;
            if (!lightbox.open) {
              if (typeof lightbox.showModal === 'function') lightbox.showModal();
              else lightbox.setAttribute('open', '');
            }
          };

          prevButton?.addEventListener('click', () => { move(-1); start(); });
          nextButton?.addEventListener('click', () => { move(1); start(); });
          toggleButton?.addEventListener('click', () => {
            paused = !paused;
            paused ? stop() : start();
            updateToggle();
          });
          carousel?.addEventListener('mouseenter', stop);
          carousel?.addEventListener('mouseleave', start);
          carousel?.addEventListener('focusin', stop);
          carousel?.addEventListener('focusout', start);
          lightboxPrev?.addEventListener('click', () => openLightbox(current - 1));
          lightboxNext?.addEventListener('click', () => openLightbox(current + 1));
          closeButton?.addEventListener('click', () => lightbox.close());
          lightbox?.addEventListener('click', (event) => {
            if (event.target === lightbox) lightbox.close();
          });
          openers.forEach((button) => {
            button.addEventListener('click', () => openLightbox(Number(button.dataset.galleryIndex)));
          });
          document.addEventListener('keydown', (event) => {
            if (!lightbox?.open) return;
            if (event.key === 'ArrowLeft') openLightbox(current + 1);
            if (event.key === 'ArrowRight') openLightbox(current - 1);
          });
          updateToggle();
          start();
        </script>
```

- [ ] **Step 4: CSS — hide inactive slides from AT/tab order, add toggle button, cap the stage**

In `src/styles/global.css`:

`.gallery-carousel__track` (line ~277): add `max-inline-size: 46rem; margin-inline: auto;`

`.gallery-carousel__slide` (line ~278-283) — `visibility: hidden` removes inactive slides from the tab order and accessibility tree (the review's P0: 75 invisible focusable buttons); pair it with the opacity transition:
```css
.gallery-carousel__slide {
  position: absolute; inset: 0; inline-size: 100%; block-size: 100%; opacity: 0;
  visibility: hidden;
  border: 0; padding: 0; background: transparent; cursor: zoom-in;
  transition: opacity .35s ease, visibility .35s;
}
.gallery-carousel__slide.is-active { opacity: 1; visibility: visible; z-index: 1; }
```

Add `.gallery-carousel__toggle` to the shared chrome selector (line ~287):
```css
.gallery-carousel__nav,
.gallery-carousel__toggle,
.gallery-lightbox__nav,
.gallery-lightbox__close { /* unchanged body */ }
```
and after the nav rules:
```css
.gallery-carousel__toggle {
  inline-size: 2.4rem; block-size: 2.4rem; border-radius: 50%; font-size: 1rem;
  inset-block-end: .8rem; inset-inline-end: .8rem;
}
```

- [ ] **Step 5: Un-pin the photo count in both check scripts**

`scripts/check-gallery-assets.mjs`: delete lines 18 and 21-23 (`expectedGalleryCount` and its `if`). The bidirectional manifest⊆files / files⊆manifest checks already pin the count to reality.

`scripts/check-site-metadata.mjs`:
- Line 53 regex: widen to thumbs: `if (!/(?:^|\/|\.\.\/)(?:images|gallery\/(?:photos|thumbs))\//.test(src)) continue;`
- Lines 72-76: derive the expected count from the manifest instead of `76`:
```js
import { load as loadYaml } from 'js-yaml';
// ...
const manifest = loadYaml(await readFile(path.join(rootDir, 'gallery', 'photos.yaml'), 'utf8'));
const expectedPhotos = Array.isArray(manifest?.photos) ? manifest.photos.length : 0;
const galleryHtml = await readFile(path.join(distDir, 'gallery', 'index.html'), 'utf8');
const galleryImageCount = new Set(
  [...galleryHtml.matchAll(/<img\b[^>]*\bsrc=["']([^"']*\/gallery\/thumbs\/[^"']+)["']/gi)].map((m) => m[1]),
).size;
if (galleryImageCount !== expectedPhotos) failures.push(`gallery page expected ${expectedPhotos} photos, found ${galleryImageCount}`);
```
Note: the count is taken from the GRID (thumbs, all 76 with real `src`); carousel slides carry `data-src`/`photos/` URLs and are intentionally excluded. The existence check regex from the earlier bullet still validates both `photos/` and `thumbs/` paths wherever a real `src` appears.

- [ ] **Step 6: Update .gitignore**

Read `.gitignore`; ensure `public/gallery/thumbs/` and `public/images-dimensions.json` are ignored the same way `public/images/` and `public/gallery/photos/` are (add whichever entries are missing).

- [ ] **Step 7: Verify**

Run: `npm run check`
Expected: all pass, including the reworked gallery checks.
Then measure the built gallery page's eager payload:
`node -e "const fs=require('fs');const h=fs.readFileSync('dist/gallery/index.html','utf8');const eager=[...h.matchAll(/<img[^>]*src=\"([^\"]*gallery[^\"]*)\"/g)].map(m=>m[1]);console.log(eager.length,'gallery imgs with real src (rest deferred via data-src)')"`
Expected: 77 (1 carousel slide + 76 grid thumbs — grid is below the fold and lazy; the 75 other slides have no src at all).
`git status` must show no new untracked files under `public/` (gitignore correct).

- [ ] **Step 8: Commit**

```bash
git add scripts/copy-images.mjs src/pages/gallery.astro src/styles/global.css scripts/check-gallery-assets.mjs scripts/check-site-metadata.mjs .gitignore
git commit -m "feat: gallery resize pipeline + accessible deferred carousel"
```

---

### Task 6: Post images, lead-image bug, dropTitleH1, nav highlight

**Files:**
- Modify: `src/lib/rehype-image-base.mjs` (full rewrite)
- Modify: `src/pages/posts/[entryId].astro:18-19,36`
- Modify: `src/lib/rehype-drop-title.mjs:5-11`
- Modify: `src/layouts/Base.astro:11-15`

**Interfaces:**
- Consumes: `public/images-dimensions.json` from Task 5.

- [ ] **Step 1: Rewrite rehype-image-base.mjs**

```js
import { visit } from 'unist-util-visit';
import fs from 'node:fs';
import path from 'node:path';

// Rewrites inline markdown images (../images/X or images/X) to <base>/images/X,
// and decorates every local images/ <img> with lazy loading + intrinsic dimensions
// (from public/images-dimensions.json, written by scripts/copy-images.mjs).
const BASE = '/shahf11-blog';

let dims;
function dimensionsFor(file) {
  if (!dims) {
    try {
      dims = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'images-dimensions.json'), 'utf8'));
    } catch {
      dims = {};
    }
  }
  return dims[file];
}

export function rewriteImageBase() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img' || !node.properties?.src) return;
      const src = String(node.properties.src);
      if (/^(https?:)?\/\//.test(src)) return; // leave external URLs alone
      let file;
      if (src.startsWith(`${BASE}/images/`)) {
        file = src.slice(`${BASE}/images/`.length);
      } else {
        const m = src.match(/(?:\.\.\/)?images\/(.+)$/);
        if (!m) return;
        file = m[1];
        node.properties.src = `${BASE}/images/${file}`;
      }
      node.properties.loading ??= 'lazy';
      node.properties.decoding ??= 'async';
      const d = dimensionsFor(file);
      if (d) {
        node.properties.width ??= d.width;
        node.properties.height ??= d.height;
      }
    });
  };
}
```

- [ ] **Step 2: Fix the lead-image suffix bug**

`src/pages/posts/[entryId].astro:19` — `endsWith(f)` treats `photo.jpg` as inline when `myphoto.jpg` is; require a path boundary:

```js
const extraImgs = post.data.images.filter((f) => !inlineImgs.some((s) => s === `images/${f}` || s.endsWith(`/${f}`)));
```

Also add `decoding="async"` to the lead-image `<img>` on line 36 (it already has `loading="lazy"`).

- [ ] **Step 3: dropTitleH1 — only strip a LEADING h1**

`src/lib/rehype-drop-title.mjs`:

```js
// Every reconstructed post body begins with an `# <title>` H1 that duplicates the
// frontmatter title — which each page already renders on its own. Drop that H1 only
// when it is the first element in the body; an H1 that appears after other content
// is a legitimate section heading and stays.
export function dropTitleH1() {
  return (tree) => {
    const children = tree.children ?? [];
    const first = children.find((n) => n.type === 'element');
    if (first?.tagName === 'h1') children.splice(children.indexOf(first), 1);
  };
}
```

- [ ] **Step 4: Highlight הבלוג while reading a post**

`src/layouts/Base.astro` — inside `isActive`, add a posts→blog mapping:

```js
const isActive = (href) => {
  const clean = withBase(href).replace(/\/$/, '');
  if (href === '/') return path === clean || path === withBase('').replace(/\/$/, '');
  if (href === 'blog' && path.startsWith(withBase('posts').replace(/\/$/, '') + '/')) return true;
  return path === clean || path.startsWith(clean + '/');
};
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Then:
`grep -o '<img[^>]*loading="lazy"[^>]*>' dist/posts/1268998/index.html | head -3` — post-body imgs carry loading/decoding/width/height (1268998 is the 20-image Paris post; if the dist dir name differs, find it via `grep -rl 'פריז' dist/posts | head -1`).
`grep -c 'aria-current="page"' dist/posts/1214120/index.html` — expected 1 (the הבלוג nav item).
`node -e "const fs=require('fs');const h=fs.readFileSync('dist/posts/1214120/index.html','utf8');console.log(/<h1 class=\"post__title/.test(h), (h.match(/<h1/g)||[]).length)"` — expected `true 1` (title rendered once, body H1 dropped).
Run: `npm run check` — all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rehype-image-base.mjs src/lib/rehype-drop-title.mjs src/pages/posts/[entryId].astro src/layouts/Base.astro
git commit -m "fix: lazy post images with dimensions, lead-image suffix bug, leading-h1 drop, post nav highlight"
```

---

### Task 7: Serve PDFs same-origin

**Files:**
- Move: `book/` → `public/book/`, `posts-pdf/` → `public/posts-pdf/` (git mv)
- Modify: `src/pages/posts/[entryId].astro:16`
- Modify: `src/pages/book.astro:37-38`
- Modify: `README.md` (posts-pdf/book path references + missing frontmatter fields)

**Interfaces:**
- Produces: PDFs served at `<base>/posts-pdf/<id>.pdf` and `<base>/book/<name>.pdf`.

Rationale recorded from review: 184 links currently point at `github.com/.../raw/main/...`, which breaks on repo rename/privatization and is rate-limited. Trade-off accepted: the Pages deploy artifact grows ~160MB (posts-pdf 152M + book 8.5M) — well within the 10GB artifact / 1GB site limits.

- [ ] **Step 1: Move the directories**

```bash
git mv book public/book
git mv posts-pdf public/posts-pdf
```

Then check `.gitignore` does NOT have a pattern that would swallow them (the generated dirs are `public/images`, `public/gallery/...` — specific patterns; verify with `git check-ignore public/posts-pdf/$(ls public/posts-pdf | head -1) || echo "not ignored — good"`).

- [ ] **Step 2: Update links**

`src/pages/posts/[entryId].astro:16`:
```js
const pdf = withBase(`posts-pdf/${post.id}.pdf`);
```

`src/pages/book.astro:37-38`:
```astro
            <a href={withBase('book/haya-basrat-an-book.pdf')}>הורדת הספר המלא (PDF)</a>
            <a href={withBase('book/meydaf-memorial-725.pdf')}>מידף לזכרה של חיה — גיליון הקהילה (PDF)</a>
```

- [ ] **Step 3: Update README**

`grep -n 'posts-pdf\|book/' README.md` and update path references to the new `public/` locations. While in README, extend the frontmatter list (around lines 26-38) with the three fields the schema defines but the doc omits: `date` (ISO date used for ordering), `title_source`, `note`.

- [ ] **Step 4: Verify**

Run: `grep -rn 'github.com/yonatankarp/shahf11-blog/raw' src/ && echo "STALE RAW LINKS" || echo "no raw links — good"`
Run: `npm run build && ls dist/posts-pdf | wc -l && ls dist/book`
Expected: `no raw links — good`; 182 PDFs in dist/posts-pdf; 2 PDFs + nothing else missing in dist/book.
Run: `npm run check` — all pass. (check-blog-assets validates images only, but re-read `scripts/check-blog-assets.mjs` to confirm nothing references the old `posts-pdf/` root path; update if it does.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: serve book and post PDFs same-origin instead of GitHub raw links"
```

---

### Task 8: Search & text cleanups

**Files:**
- Modify: `src/lib/posts.ts:20-29`
- Modify: `src/pages/search-index.json.ts:17-22,28`
- Modify: `src/pages/tags/index.astro:78-100`
- Modify: `src/lib/tags.ts` (comments + dead code)
- Modify: `src/pages/blog/[...page].astro:28-34`
- Modify: `src/pages/tags/[slug]/[...page].astro` (same pagination pattern — read first)

**Interfaces:**
- Produces: `plainText(body: string): string` exported from `src/lib/posts.ts`, consumed by `excerpt` and `search-index.json.ts`.

- [ ] **Step 1: Shared markdown-stripper in posts.ts**

Replace `excerpt` (`src/lib/posts.ts:20-29`) with:

```ts
export function plainText(body: string): string {
  return body
    .replace(/^\s*#[^\n]*\n+/, '') // drop the leading "# <title>" heading each post opens with
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links: keep the text, drop the (url)
    .replace(/[#>*_`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(body: string, words = 30): string {
  const text = plainText(body);
  const parts = text.split(' ');
  return parts.length <= words ? text : parts.slice(0, words).join(' ') + '…';
}
```

- [ ] **Step 2: Use it in the search index**

`src/pages/search-index.json.ts` — import `plainText` and replace the inline `body` cleaning (lines 17-22):

```ts
import { getAllPosts, excerpt, plainText } from '../lib/posts';
// ...
    const body = plainText(p.body ?? '');
```

- [ ] **Step 3: Fix the first-search live region + debounce**

`src/pages/tags/index.astro`, in `run()`: a live region inside a `display:none` subtree announces nothing — unhide BEFORE writing the count. Reorder the tail of `run()` (lines 89-97):

```js
      results.hidden = false;
      countEl.textContent = matches.length
        ? `${matches.length} רשומות שמזכירות ״${input.value.trim()}״`
        : `לא נמצאו רשומות עבור ״${input.value.trim()}״`;
      hitsEl.innerHTML = shown.map((p) =>
        `<li class="search-hit"><a class="search-hit__title" href="${esc(p.url)}">${esc(p.title)}</a>` +
        `<span class="search-hit__date">${esc(p.date)}</span>` +
        `<p class="search-hit__ex">${esc(p.excerpt)}</p></li>`).join('') +
        (matches.length > shown.length ? `<li class="search-hit__more">מוצגות ${shown.length} מתוך ${matches.length}. צמצמו את החיפוש.</li>` : '');
```

and replace the listener (line 100) with a debounced one:

```js
    let debounceTimer;
    input?.addEventListener('input', () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(run, 150);
    });
```

- [ ] **Step 4: tags.ts — fix comments, delete dead exports**

First verify unused: `grep -rn 'postsForTag\|findTag' src/ --include='*.astro' --include='*.ts'` — expect hits only inside `src/lib/tags.ts` itself. Then in `src/lib/tags.ts`:
- Delete `postsForTag` (lines 16-19) and `findTag` (lines 53-59).
- Line 27 comment: change `(newest-first)` to `(oldest-first)`.

- [ ] **Step 5: Pagination accessible names**

`src/pages/blog/[...page].astro:30-32`:
```astro
          {n === page.currentPage
            ? <span class="pagination__page is-current" aria-current="page" aria-label={`עמוד ${n}`}>{n}</span>
            : <a class="pagination__page" href={pageHref(n)} aria-label={`עמוד ${n}`}>{n}</a>}
```
Apply the identical pattern to the numbered-page list in `src/pages/tags/[slug]/[...page].astro` (read the file; it has the same `pagination__page` markup).

- [ ] **Step 6: Verify**

Run: `npm run build`
`node -e "const d=require('./dist/search-index.json');const bad=d.filter(p=>/https?:\/\//.test(p.excerpt));console.log(bad.length,'excerpts with raw urls')"` — expected `0 excerpts with raw urls`.
`npx astro check` — no TS errors from the removed exports.
Run: `npm run check` — all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/posts.ts src/lib/tags.ts src/pages/search-index.json.ts src/pages/tags/index.astro src/pages/blog/[...page].astro 'src/pages/tags/[slug]/[...page].astro'
git commit -m "fix: search live-region announcement, link-url stripping, pagination labels, dead code"
```

---

### Task 9: CSS / a11y polish

**Files:**
- Modify: `src/styles/global.css` (nav targets ~line 71-77, disabled step ~line 165, book-page ~line 336, reduced-motion ~line 385)
- Modify: `src/layouts/Base.astro:44` (main tabindex)

- [ ] **Step 1: Nav touch targets**

`src/styles/global.css` `.site-links a` (line ~75): standalone links must clear 24×24px (WCAG 2.5.8):
```css
.site-links a { color: var(--mut); text-decoration: none; display: inline-block; padding-block: .45rem; }
```
(and trim the bar's block padding to compensate: `.site-nav-bar` padding `.55rem 1.4rem` instead of `.9rem 1.4rem`, so the bar height stays roughly the same.)

- [ ] **Step 2: Darken disabled pagination steps**

Line ~165: `.pagination__step.is-disabled { color: #8f7a63; }` (from `#cdbba6` at 1.64:1 — the new value reads muted but stays legible for low-vision readers).

- [ ] **Step 3: Narrow the letters measure**

Line ~336: `.book-page { max-width: 62ch; margin: 0 auto; }` (72ch is past the comfortable RTL serif measure).

- [ ] **Step 4: Future-proof reduced-motion**

Line ~385:
```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

- [ ] **Step 5: Focusable main**

`src/layouts/Base.astro:44`:
```astro
    <main id="main" tabindex="-1" class:list={['wrap', { 'wrap--wide': wide }]}><slot /></main>
```

- [ ] **Step 6: Verify + commit**

Run: `npm run check` — all pass. Eyeball the header height didn't jump: `npx astro preview` + screenshot if in doubt.
```bash
git add src/styles/global.css src/layouts/Base.astro
git commit -m "fix: touch targets, disabled-step contrast, letters measure, reduced-motion, focusable main"
```

---

### Task 10: CI/deploy parity

**Files:**
- Modify: `.github/workflows/ci.yml:36-43`
- Modify: `.github/workflows/deploy.yml:18`

- [ ] **Step 1: ci.yml — run the full check suite**

Replace the three steps `Check blog assets` / `Build` / `Check generated site metadata` (lines 36-43) with a single step so ci and `npm run check` can't drift again:

```yaml
      - name: Check + build (blog assets, gallery assets, build, site metadata)
        run: npm run check
```

(The playwright visual-capture steps after it stay unchanged — they need the `dist/` this step produces.)

- [ ] **Step 2: deploy.yml — never publish unchecked**

Line 18: change `- run: npm run build` to `- run: npm run check` (check includes the build; dist/ is produced the same way).

- [ ] **Step 3: Verify + commit**

Run: `npm run check` locally once more (same command CI will run).
Optionally validate workflow syntax: `npx --yes yaml-lint .github/workflows/ci.yml .github/workflows/deploy.yml` or a plain `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'));console.log('ok')"` for each file.
```bash
git add .github/workflows/ci.yml .github/workflows/deploy.yml
git commit -m "ci: run the full check suite in CI and before deploy"
```

---

### Task 11: Final verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Full check from clean**

```bash
rm -rf dist public/images public/gallery/photos public/gallery/thumbs public/images-dimensions.json
npm run check
```
Expected: all four stages green from scratch.

- [ ] **Step 2: Visual smoke**

```bash
npm run visual:capture
```
View the screenshots (Read tool) — home (new hero portrait, no doubled image), gallery (carousel centered, pause button visible), a post page, blog list. Confirm nothing regressed visually.

- [ ] **Step 3: Weight audit**

```bash
du -sh dist
node -e "const fs=require('fs');const h=fs.readFileSync('dist/gallery/index.html','utf8');console.log('imgs with src:',(h.match(/<img[^>]* src=/g)||[]).length,'| data-src only:',(h.match(/data-src=/g)||[]).length)"
```
Expected: gallery thumbs payload a small fraction of the old ~52MB; 75 slides deferred.

- [ ] **Step 4: Report**

Summarize per-task results honestly (including anything skipped or failed) before moving to the finishing-a-development-branch skill.

## Explicitly out of scope (user decisions / can't be done honestly)

- Preface transcription — user chose to skip.
- Video captions/transcript — requires listening to the audio; flagged to user as open a11y item.
- Per-photo gallery captions/alt texts — would require the family to identify people/places; the indexed button names fix the duplicate-name violation without inventing content.
- News-article text summary on the book page — same fabrication concern; alt text already describes the artifact.
