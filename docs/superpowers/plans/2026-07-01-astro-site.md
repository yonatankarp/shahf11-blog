# חיה בסרט(ן) Astro Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, RTL-Hebrew Astro blog that renders the 170 markdown posts in `content/`, deployed to GitHub Pages.

**Architecture:** Astro app at the repo root. Content stays in `content/*.md` (loaded in place via the glob loader, so files keep rendering on GitHub). A single data-access module feeds a paginated feed and per-post pages. Images stay in `images/` (copied into `public/images/` at build; inline `../images/` links rewritten to the base path by a rehype step). PDFs are linked to GitHub raw URLs, not bundled.

**Tech Stack:** Astro 5.x, TypeScript, `@fontsource-variable/frank-ruhl-libre` + `@fontsource-variable/assistant`, `unist-util-visit` (rehype image rewrite), GitHub Actions + Pages.

## Global Constraints

- Node 20+; Astro 5.x.
- `astro.config.mjs`: `site: 'https://yonatankarp.github.io'`, `base: '/shahf11-blog'`. Every internal link and asset path uses `import.meta.env.BASE_URL` — never a hardcoded leading `/`.
- `<html lang="he" dir="rtl">`. Use CSS logical properties (`margin-inline`, `padding-block`, `inset-inline`) — never left/right.
- No external CDNs (self-host fonts via fontsource).
- No automated test suite. Verify each task with `npm run build` and, where visual, `npm run preview` + a look at the page.
- Content files live at repo root `content/`; do not move them. Images live at repo root `images/`; do not move them.
- PDF download links point to `https://github.com/yonatankarp/shahf11-blog/raw/main/posts-pdf/<file>`.
- Feed order: newest-first by `date`.
- Commit after every task with a `feat:`/`chore:` message.

---

### Task 1: Scaffold the Astro app

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore` (append), `src/env.d.ts`

**Interfaces:**
- Produces: a buildable Astro project with `base`/`site` configured; `npm run build` and `npm run preview` scripts.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "shahf11-blog",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "copy:images": "node scripts/copy-images.mjs",
    "dev": "npm run copy:images && astro dev",
    "build": "npm run copy:images && astro build",
    "preview": "astro preview",
    "check": "astro check"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@fontsource-variable/frank-ruhl-libre": "^5.0.0",
    "@fontsource-variable/assistant": "^5.0.0",
    "unist-util-visit": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `astro.config.mjs`** (rehype image-rewrite plugin is added in Task 5; leave a placeholder import comment)

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://yonatankarp.github.io',
  base: '/shahf11-blog',
  trailingSlash: 'ignore',
  markdown: {
    // rehypePlugins: [rewriteImageBase]  // added in Task 5
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{ "extends": "astro/tsconfigs/strict", "include": [".astro/types.d.ts", "**/*"], "exclude": ["dist"] }
```

- [ ] **Step 4: Append to `.gitignore`**

```
node_modules/
dist/
.astro/
public/images/
```

- [ ] **Step 5: Install and build**

Run: `npm install && npm run build`
Expected: build succeeds with "0 page(s)" (no pages yet). `copy:images` will error until Task 5 creates the script — if so, temporarily run `npx astro build` for this task only.

- [ ] **Step 6: Commit**

```bash
git add package.json astro.config.mjs tsconfig.json .gitignore src/env.d.ts
git commit -m "chore: scaffold Astro app with base path"
```

---

### Task 2: Content collection + schema

**Files:**
- Create: `src/content.config.ts`

**Interfaces:**
- Produces: collection `posts` whose entry `id` is the filename stem; `data` typed per the schema below (consumed by `src/lib/posts.ts` in Task 3).

- [ ] **Step 1: Create `src/content.config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '*.md', base: './content' }),
  schema: z.object({
    entryId: z.string(),
    title: z.string(),
    title_source: z.string().optional(),
    date: z.coerce.date(),
    date_published: z.string(),
    category: z.string(),
    date_stamp: z.string().default(''),
    source_url: z.string(),
    source_scan: z.string().default(''),
    pages: z.number(),
    lang: z.literal('he'),
    images: z.array(z.string()).default([]),
    review: z.array(z.string()).default([]),
    note: z.string().default(''),
    tags: z.array(z.string()).default([]), // forward-compat: unused now
  }),
});

export const collection = { posts };
```

- [ ] **Step 2: Verify the schema loads all 170**

Run: `npm run check`
Expected: no schema errors. If a field mismatch is reported, fix the schema (do not edit content).

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "feat: posts content collection with typed schema"
```

---

### Task 3: Posts data-access module

**Files:**
- Create: `src/lib/posts.ts`

**Interfaces:**
- Consumes: `getCollection('posts')` from `astro:content`.
- Produces:
  - `getAllPosts(): Promise<PostEntry[]>` — all posts sorted by `data.date` descending.
  - `getAdjacent(entryId: string): Promise<{ newer: PostEntry | null; older: PostEntry | null }>`.
  - `excerpt(body: string, words?: number): string` — plain-text excerpt, markdown/image syntax stripped.
  - `PostEntry` = `CollectionEntry<'posts'>`.

- [ ] **Step 1: Create `src/lib/posts.ts`**

```ts
import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;

export async function getAllPosts(): Promise<PostEntry[]> {
  const posts = await getCollection('posts');
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getAdjacent(entryId: string) {
  const posts = await getAllPosts(); // newest-first
  const i = posts.findIndex((p) => p.data.entryId === entryId);
  return {
    newer: i > 0 ? posts[i - 1] : null,
    older: i >= 0 && i < posts.length - 1 ? posts[i + 1] : null,
  };
}

export function excerpt(body: string, words = 30): string {
  const text = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/[#>*_`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = text.split(' ');
  return parts.length <= words ? text : parts.slice(0, words).join(' ') + '…';
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run check`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/posts.ts
git commit -m "feat: posts data-access module"
```

---

### Task 4: Base layout, fonts, RTL global styles

**Files:**
- Create: `src/layouts/Base.astro`, `src/styles/global.css`

**Interfaces:**
- Produces: `Base.astro` accepting props `{ title: string; description?: string }` and a default slot; sets `<html lang="he" dir="rtl">`, imports fonts + global css, renders site header (title + tagline) and footer.

- [ ] **Step 1: Create `src/styles/global.css`**

```css
:root {
  --bg: #fbf9f4; --fg: #2b2622; --muted: #6b625a; --rule: #e6ddcf;
  --accent: #9a4a3c; --link: #7a3d33;
  --serif: 'Frank Ruhl Libre Variable', Georgia, serif;
  --sans: 'Assistant Variable', system-ui, sans-serif;
  --measure: 34rem;
}
* { box-sizing: border-box; }
html { color-scheme: light; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font-family: var(--serif); font-size: 1.15rem; line-height: 1.85;
}
a { color: var(--link); }
.wrap { max-inline-size: var(--measure); margin-inline: auto; padding-inline: 1.25rem; }
.site-header { border-block-end: 1px solid var(--rule); padding-block: 1.5rem; text-align: center; }
.site-header h1 { font-size: 2rem; margin: 0; }
.site-header p { font-family: var(--sans); color: var(--muted); margin: .35rem 0 0; font-size: .95rem; }
.site-footer { border-block-start: 1px solid var(--rule); margin-block-start: 3rem; padding-block: 2rem; font-family: var(--sans); color: var(--muted); font-size: .85rem; text-align: center; }
h1, h2, h3 { line-height: 1.3; }
img { max-inline-size: 100%; height: auto; border-radius: 2px; }
```

- [ ] **Step 2: Create `src/layouts/Base.astro`**

```astro
---
import '@fontsource-variable/frank-ruhl-libre';
import '@fontsource-variable/assistant';
import '../styles/global.css';
const { title, description } = Astro.props;
const base = import.meta.env.BASE_URL;
---
<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
  </head>
  <body>
    <header class="site-header">
      <a href={base} style="text-decoration:none;color:inherit"><h1>חיה בסרט(ן)</h1></a>
      <p>הסרט שלי השנה: סרטן השד. האמונה שלי: השד לא נורא כל כך</p>
    </header>
    <main class="wrap"><slot /></main>
    <footer class="site-footer">
      ארכיון הבלוג של shahf11 · <a href="https://github.com/yonatankarp/shahf11-blog">GitHub</a>
    </footer>
  </body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Base.astro src/styles/global.css
git commit -m "feat: base layout, self-hosted Hebrew fonts, RTL styles"
```

---

### Task 5: Image pipeline (copy + base-path rewrite)

**Files:**
- Create: `scripts/copy-images.mjs`, `src/lib/rehype-image-base.mjs`
- Modify: `astro.config.mjs`

**Interfaces:**
- Produces: at build, `images/` is copied to `public/images/`; inline markdown image `src` values starting with `../images/` or `images/` are rewritten to `<base>/images/<file>`.

- [ ] **Step 1: Create `scripts/copy-images.mjs`**

```js
import { cp, mkdir } from 'node:fs/promises';
await mkdir('public/images', { recursive: true });
await cp('images', 'public/images', { recursive: true });
console.log('copied images -> public/images');
```

- [ ] **Step 2: Create `src/lib/rehype-image-base.mjs`**

```js
import { visit } from 'unist-util-visit';

// Rewrites inline markdown images (../images/X or images/X) to <base>/images/X.
export function rewriteImageBase() {
  const base = (process.env.BASE_URL || '/shahf11-blog').replace(/\/$/, '');
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img' || !node.properties?.src) return;
      const src = String(node.properties.src);
      const m = src.match(/(?:\.\.\/)?images\/(.+)$/);
      if (m) node.properties.src = `${base}/images/${m[1]}`;
    });
  };
}
```

- [ ] **Step 3: Wire the plugin in `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import { rewriteImageBase } from './src/lib/rehype-image-base.mjs';

export default defineConfig({
  site: 'https://yonatankarp.github.io',
  base: '/shahf11-blog',
  trailingSlash: 'ignore',
  markdown: { rehypePlugins: [rewriteImageBase] },
});
```

- [ ] **Step 4: Verify copy + build**

Run: `npm run build`
Expected: logs "copied images -> public/images"; build succeeds; `public/images/` contains 58 jpgs.

- [ ] **Step 5: Commit**

```bash
git add scripts/copy-images.mjs src/lib/rehype-image-base.mjs astro.config.mjs
git commit -m "feat: image pipeline — copy to public and rewrite base path"
```

---

### Task 6: Paginated feed

**Files:**
- Create: `src/components/PostCard.astro`, `src/pages/index.astro`, `src/pages/page/[page].astro`

**Interfaces:**
- Consumes: `getAllPosts`, `excerpt` (Task 3); `Base.astro` (Task 4).
- Produces: `/` (page 1) and `/page/2`, `/page/3`, … each showing 15 `PostCard`s + prev/next.

- [ ] **Step 1: Create `src/components/PostCard.astro`**

```astro
---
import { excerpt } from '../lib/posts';
const { post } = Astro.props;
const base = import.meta.env.BASE_URL;
const href = `${base}posts/${post.data.entryId}`;
---
<article style="padding-block:1.5rem;border-block-end:1px solid var(--rule)">
  <h2 style="margin:0 0 .25rem"><a href={href} style="text-decoration:none">{post.data.title}</a></h2>
  <p style="font-family:var(--sans);color:var(--muted);font-size:.85rem;margin:0 0 .5rem">{post.data.date_published}</p>
  <p style="margin:0">{excerpt(post.body ?? '')}</p>
</article>
```

- [ ] **Step 2: Create `src/pages/page/[page].astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import PostCard from '../../components/PostCard.astro';
import { getAllPosts } from '../../lib/posts';

export async function getStaticPaths({ paginate }) {
  const posts = await getAllPosts();
  return paginate(posts, { pageSize: 15 });
}
const { page } = Astro.props;
const base = import.meta.env.BASE_URL;
---
<Base title="חיה בסרט(ן)">
  {page.data.map((post) => <PostCard post={post} />)}
  <nav style="display:flex;justify-content:space-between;font-family:var(--sans);padding-block:2rem">
    {page.url.next ? <a href={page.url.next}>← ישנים יותר</a> : <span />}
    {page.url.prev ? <a href={page.url.prev}>חדשים יותר →</a> : <span />}
  </nav>
</Base>
```

- [ ] **Step 3: Create `src/pages/index.astro`** (page 1 = same as `/page/1`)

```astro
---
import Base from '../layouts/Base.astro';
import PostCard from '../components/PostCard.astro';
import { getAllPosts } from '../lib/posts';
const posts = (await getAllPosts()).slice(0, 15);
const base = import.meta.env.BASE_URL;
const hasNext = (await getAllPosts()).length > 15;
---
<Base title="חיה בסרט(ן) — ארכיון">
  {posts.map((post) => <PostCard post={post} />)}
  <nav style="display:flex;justify-content:flex-start;font-family:var(--sans);padding-block:2rem">
    {hasNext && <a href={`${base}page/2`}>← ישנים יותר</a>}
  </nav>
</Base>
```

- [ ] **Step 4: Verify feed + pagination**

Run: `npm run build && npm run preview`
Open `http://localhost:4321/shahf11-blog/` and `/shahf11-blog/page/2`.
Expected: 15 newest posts on page 1 (top card dated 2009-07-30), RTL layout, working prev/next. Confirm ~12 pages exist (170/15).

- [ ] **Step 5: Commit**

```bash
git add src/components/PostCard.astro src/pages/index.astro src/pages/page/
git commit -m "feat: paginated newest-first feed"
```

---

### Task 7: Post page

**Files:**
- Create: `src/pages/posts/[entryId].astro`

**Interfaces:**
- Consumes: `getAllPosts`, `getAdjacent` (Task 3); `render()` from `astro:content`.
- Produces: `/posts/<entryId>` for all 170 posts.

- [ ] **Step 1: Create `src/pages/posts/[entryId].astro`**

```astro
---
import { render } from 'astro:content';
import Base from '../../layouts/Base.astro';
import { getAllPosts, getAdjacent } from '../../lib/posts';

export async function getStaticPaths() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ params: { entryId: post.data.entryId }, props: { post } }));
}
const { post } = Astro.props;
const { Content } = await render(post);
const { newer, older } = await getAdjacent(post.data.entryId);
const base = import.meta.env.BASE_URL;
const pdf = `https://github.com/yonatankarp/shahf11-blog/raw/main/posts-pdf/${post.id}.pdf`;
const truncated = post.data.review.includes('scan-truncated');
// frontmatter images not already shown inline in the body
const inlineImgs = (post.body ?? '').match(/images\/[^\s)]+/g) ?? [];
const extraImgs = post.data.images.filter((f) => !inlineImgs.some((s) => s.endsWith(f)));
---
<Base title={post.data.title}>
  <article>
    <h1>{post.data.title}</h1>
    <p style="font-family:var(--sans);color:var(--muted);font-size:.9rem">{post.data.date_published}</p>
    {truncated && (
      <p style="font-family:var(--sans);font-size:.85rem;background:#f3ead9;border-inline-start:3px solid var(--accent);padding:.6rem .8rem">
        הערה: הסריקה של רשומה זו חתוכה בשוליים וחלק מהטקסט חסר. התמלול הוא כמיטב היכולת; ראו את הסריקה המקורית.
      </p>
    )}
    <Content />
    {extraImgs.length > 0 && (
      <section style="margin-block-start:2rem">
        {extraImgs.map((f) => <img src={`${base}images/${f}`} alt="" loading="lazy" />)}
      </section>
    )}
    <p style="font-family:var(--sans);font-size:.9rem;margin-block-start:2rem">
      <a href={pdf}>הורדת הסריקה המקורית (PDF)</a>
    </p>
    <nav style="display:flex;justify-content:space-between;font-family:var(--sans);border-block-start:1px solid var(--rule);padding-block:1.5rem;margin-block-start:2rem">
      {older ? <a href={`${base}posts/${older.data.entryId}`}>← {older.data.title}</a> : <span />}
      {newer ? <a href={`${base}posts/${newer.data.entryId}`}>{newer.data.title} →</a> : <span />}
    </nav>
  </article>
</Base>
```

- [ ] **Step 2: Verify representative posts**

Run: `npm run build && npm run preview`
Check: `/shahf11-blog/posts/1214120` (text-only, first post), `/shahf11-blog/posts/1337229` (inline images render from `<base>/images/…`), `/shahf11-blog/posts/1280359` (shows the truncation note), `/shahf11-blog/posts/1270292` (the 42-item list renders). Confirm PDF link points to the GitHub raw URL and prev/next work.

- [ ] **Step 3: Commit**

```bash
git add src/pages/posts/
git commit -m "feat: per-post page with images, PDF link, prev/next"
```

---

### Task 8: About page, then polished design pass

**Files:**
- Create: `src/pages/about.astro`
- Modify: `src/styles/global.css`, `src/layouts/Base.astro`, components (design refinement)

**Interfaces:**
- Consumes: `Base.astro`.
- Produces: `/about`; refined visual design across layout + pages.

- [ ] **Step 1: Create `src/pages/about.astro`**

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="על הבלוג">
  <article>
    <h1>על הבלוג</h1>
    <p>ארכיון הבלוג "חיה בסרט(ן)" מאת shahf11, שהתפרסם באתר תפוז בלוגים בשנים 2008–2009. הבלוג מתעד את מסע ההתמודדות עם סרטן השד, בהומור.</p>
    <p>הרשומות שוחזרו מתוך תדפיסים סרוקים באמצעות זיהוי תווים (OCR) בעברית; הכותרות אומתו במודל ראייה. ייתכנו שגיאות זיהוי; הסריקה המקורית של כל רשומה זמינה להורדה.</p>
  </article>
</Base>
```

- [ ] **Step 2: Add an About link to the footer in `src/layouts/Base.astro`**

Change the footer line to include: `<a href={`${base}about`}>על הבלוג</a> · ` before the GitHub link.

- [ ] **Step 3: Polished design pass**

Invoke the `frontend-design` skill (or `impeccable`) to refine: type scale and rhythm for Hebrew serif, the header/masthead treatment, card hover, link styling, spacing, a restrained accent, and subtle motion. Keep it dignified-but-light; respect RTL and logical properties. Constraint: no external CDNs, no new heavy dependencies.

- [ ] **Step 4: Verify**

Run: `npm run build && npm run preview` and review `/`, a post, and `/about` at mobile and desktop widths. Confirm no horizontal scroll, RTL correct, fonts loaded (no FOUT flash to a serif fallback).

- [ ] **Step 5: Commit**

```bash
git add src/pages/about.astro src/layouts/Base.astro src/styles/global.css src/components/
git commit -m "feat: about page and polished editorial design"
```

---

### Task 9: GitHub Pages deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: CI that builds and deploys to Pages on push to `main`.

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy site
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Enable Pages via GitHub Actions**

Run: `gh api --method POST repos/yonatankarp/shahf11-blog/pages -f build_type=workflow` (if it already exists, run `--method PUT` on `repos/.../pages` with `build_type=workflow`).
Expected: Pages source set to "GitHub Actions".

- [ ] **Step 3: Add a lockfile and commit**

Run: `npm install` (generates `package-lock.json` for `npm ci`).

```bash
git add .github/workflows/deploy.yml package-lock.json
git commit -m "chore: GitHub Pages deploy workflow"
```

- [ ] **Step 4: Verify after merge**

The workflow runs on push to `main` (i.e., after this branch's PR merges). Watch: `gh run watch` on the triggered run; then open `https://yonatankarp.github.io/shahf11-blog/` and click through a post + PDF link.

---

## Finalization (not a task — sequencing note)

This branch (`feat/astro-site`) is stacked on the data-fixes work. Before deploy is meaningful, PRs #2 and #3 must be on `main`. Order: merge #2 → merge #3 → rebase `feat/astro-site` onto `main` (`git rebase --onto origin/main chore/data-fixes feat/astro-site`) → open this branch's PR → merge → deploy workflow runs.

## Self-Review

- **Spec coverage:** content layer (T2), data access + forward-compat tags (T2 schema, T3), paginated newest-first feed (T6), post page with Hebrew date/body/inline images/PDF link/prev-next/truncation note (T7), RTL + self-hosted fonts + polished design (T4, T8), image handling (T5), base path everywhere (all tasks via BASE_URL), PDF→GitHub raw (T7), about page (T8), GH Pages deploy (T9). All covered.
- **Placeholder scan:** none — every file has concrete contents.
- **Type consistency:** `getAllPosts`/`getAdjacent`/`excerpt`/`PostEntry` names match between T3 and their consumers in T6/T7. PDF path `posts-pdf/${post.id}.pdf` matches the renamed PDFs (page-count suffix dropped from filenames in PR #4; the `pages` frontmatter field is kept in the schema).
