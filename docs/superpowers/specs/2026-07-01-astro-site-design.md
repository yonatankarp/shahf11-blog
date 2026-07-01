# חיה בסרט(ן) — Astro site design

Static site that rebuilds the Hebrew blog **חיה בסרט(ן)** (shahf11, tapuz 2008–2009) from the
170 markdown posts in `content/`, hosted on GitHub Pages.

## Goals

- Render all 170 posts as a readable, RTL Hebrew blog with polished editorial typography.
- Preserve fidelity: real publish dates, categories, inline photos, and a link to each original scanned PDF.
- Build on the existing repo without duplicating content; `content/*.md` keep working on GitHub too.
- Not preclude search and tags, which the owner will add later.

## Non-goals (this pass)

Search, tags/taxonomy, comments, the single-image posts' inline image positioning. Every post is
category `כללי`, so no category nav yet.

## Architecture

Astro app added at the repo root; `content/`, `images/`, `posts-pdf/` stay in place.

- **Content layer.** Astro content collection `posts` via the glob loader over `./content/*.md`
  (files stay at repo root). Zod schema — see Data model. Validation runs at build; bad frontmatter
  fails the build.
- **Data access.** A single `src/lib/posts.ts` module exposes `getAllPosts()` (sorted by `date`
  desc), `getAdjacent(entryId)`, and pagination helpers. All pages go through it, so a future search
  index or tag filter is added in one place.
- **Routing.**
  - `/` and `/page/[n]` — paginated feed, newest-first, 15/page, prev/next. Card = title, Hebrew
    date, excerpt.
  - `/posts/[entryId]` — full post (see Pages).
  - `/about` — blog tagline + one-paragraph archival note (what this is, OCR provenance, link to repo).
- **Deploy.** `.github/workflows/deploy.yml` builds and publishes to Pages on push to `main`.
  `astro.config.mjs`: `site: 'https://yonatankarp.github.io'`, `base: '/shahf11-blog'`. All internal
  links use `import.meta.env.BASE_URL`. Pages source must be set to "GitHub Actions" once (via `gh api`).

## Data model (Zod schema)

```
entryId: string            # also the URL slug
title: string
date: coerce.date()        # ISO, sort key
date_published: string     # Hebrew display string, e.g. "18 במרץ 2008, 0:47"
category: string
source_url: string.url()
source_scan: string
pages: number
lang: literal('he')
images: string[].default([])
review: string[].default([])   # e.g. "scan-truncated"; drives archival note
note: string.default('')
title_source: string.optional()
# forward-compat: tags: string[].default([]) can be added later without breaking existing files
```

## Pages / components

- **PostCard** — title (link), Hebrew date, ~30-word excerpt (strip markdown/`![]`).
- **Post page** — H1 title; Hebrew publish date; RTL rendered markdown body (inline images
  optimized by Astro); older/newer nav by `date`; "הורדת הסריקה המקורית (PDF)" link to the GitHub
  raw URL `…/raw/main/posts-pdf/<file>`; if `review` includes `scan-truncated`, a small inline note
  that the text is incomplete pending re-scan.
- **Layout** — `<html lang="he" dir="rtl">`, site header (title חיה בסרט(ן) + tagline), footer
  (attribution + repo link), font + base styles.

## Styling / RTL (polished)

- `dir="rtl"`, logical CSS properties (margin-inline, etc.) so layout is direction-correct.
- Self-hosted fonts via fontsource (no external CDN — strict CSP / offline safe): **Frank Ruhl
  Libre** (serif) for titles + body, **Assistant** for UI/nav.
- Warm, restrained editorial palette; generous measure and line-height; dignified but light tone
  (matches the blog's dark humor, not somber). Design executed with a frontend-design skill in
  implementation.

## Images / PDFs

- Inline `![](../images/…)` resolve on disk relative to each `.md` and are optimized by Astro
  (~22MB source, bundled).
- Original PDFs (~150MB) are **not** bundled; download links point to the GitHub raw URL so the
  built site stays small.

## Out of scope / risks

- Base-path correctness on Pages is the main footgun; every internal link and asset must respect
  `BASE_URL`. Verified by a local `astro build && astro preview` before deploy.
- 079's inline image-to-photo alignment is best-effort (multi-image pages); acceptable.
- Depends on the content in PRs #2 and #3 being on `main`; this branch is based on the data-fixes
  work and should be rebased onto `main` once those merge.
