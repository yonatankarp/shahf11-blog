# Split high-res photo backup from web JPEGs

Date: 2026-07-06

## Problem

57 blog photos were re-sharpened with Gemini into high-res PNGs (up to 10MB each,
431MB total) that now sit in `images/`. Two conflicting needs:

1. Keep the pristine sharpened PNGs as a future-proof backup (today's web resolution
   will look dated in a few years; the originals let us regenerate at higher res).
2. Serve small images on the web.

Additionally the swap broke the build: content references `.jpg` (both frontmatter
`images: [...]` and inline `![](../images/….jpg)`), but `copy-images.mjs` keeps the
source extension, so `.png` sources emit `.png` derivatives → 404 on a clean build.

## Decisions

- Backup location: **Git LFS** (chosen over out-of-band archive or committing raw PNGs).
- Build source: **cold-backup LFS** — the build reads small committed JPEGs; the LFS
  PNGs are a cold archive the build never touches. This avoids CI pulling 431MB per run
  (GitHub free tier is 1GB LFS bandwidth/month).
- Web resolution stays **1600px** (unchanged). Future-proofing lives in the LFS
  originals, which is the correct place for it.

## Design

### Layout after the change

- `images/*.jpg` — web-source JPEGs, committed to git normally. The 57 sharpened ones
  are regenerated from the PNGs at **2048px, quality 88, mozjpeg, EXIF-rotation baked
  in**. The ~7 pre-existing JPGs (handwritten scan, the one photo Gemini refused, etc.)
  stay untouched — no sharpened original exists for them. This is what content
  references and what the build reads.
- `images-original/*.png` — the 57 pristine Gemini PNGs (431MB), tracked by Git LFS,
  never read by the build. Pure cold backup. Only PNGs that were actually sharpened live
  here.

### Why 2048px q88 for the committed intermediate

`copy-images.mjs` already downscales `images/` to 1600px q80 for the web. Feeding it a
2048px q88 intermediate keeps the web asset a single downscale from a high-quality
source (minimizes — does not eliminate — double-JPEG loss) and makes the committed file
a usable mid-res fallback if LFS is ever unavailable. `copy-images.mjs` needs no change:
it already outputs `.jpg` from `.jpg` sources, so links resolve.

### Git LFS setup

- `.gitattributes`: `images-original/*.png filter=lfs diff=lfs merge=lfs -text`
- The PNGs are currently untracked, so no history rewrite is needed.
- No CI workflow change: `actions/checkout` does not pull LFS unless `lfs: true`, and
  the build never reads `images-original/`. On CI the PNGs stay as pointer stubs,
  harmlessly ignored.

### One-time migration script (`scripts/migrate-images-to-lfs.mjs`)

Kept in the repo for reproducibility. Strict ordering to avoid the LFS footgun:

1. Ensure `git lfs install` has run.
2. Write `.gitattributes` with the track rule; run `git lfs track "images-original/*.png"`;
   **stage `.gitattributes`** — before any PNG is added.
3. `mkdir -p images-original`.
4. For each `images/*.png`: write `images/<name>.jpg` via sharp
   (`.rotate().resize({ width: 2048, withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true })`),
   then move the pristine PNG to `images-original/<name>.png` and remove it from `images/`.

The script performs the file transforms; the `git add` of `images-original/` happens
after tracking is confirmed active.

## Prerequisite

`brew install git-lfs && git lfs install` (git lfs is not currently installed).

## Verification (evidence, not assumptions)

- `git lfs ls-files` lists **all 57** PNGs. If any PNG is missing, stop — it is a
  regular blob in history and must be undone before pushing.
- `npm run check` passes end to end (`check:blog-assets` validates every frontmatter +
  body reference resolves; `check:gallery-assets`; full `astro build`; `check:site-metadata`).
- Spot-check `public/images/*.jpg` are small (~150–300KB) and render, including the
  Gemini-refused photo (`137_…` / `173_…handwritten`) which flows through as a plain JPG.
- `images/` contains no `.png` after migration.

## Out of scope

- Bumping web resolution above 1600px.
- Re-sharpening the photo Gemini refused, or the handwritten scan.
- Rewriting existing git history (the 281MB `.git` predates this work).

## Delivery

As a draft PR per the repo's PR-per-change workflow.
