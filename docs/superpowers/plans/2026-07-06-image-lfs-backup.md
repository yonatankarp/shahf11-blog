# Image LFS Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the 57 Gemini-sharpened high-res PNGs as a Git LFS cold backup while serving small committed JPEGs on the web.

**Architecture:** Two image trees. `images/*.jpg` are small web-source JPEGs regenerated from the PNGs (2048px q88), committed normally, read by the existing `copy-images.mjs` build. `images-original/*.png` holds the pristine PNGs in Git LFS, never read by the build and never pulled by CI. No change to `copy-images.mjs` or CI workflows.

**Tech Stack:** Node + sharp (already a dependency), Git LFS 3.7.1 (installed), Astro build.

## Global Constraints

- Git LFS ordering: `.gitattributes` + `git lfs track` MUST be staged before any PNG is `git add`-ed. A PNG added before tracking is active becomes a permanent regular blob.
- Proof gate: `git lfs ls-files` must list all 57 PNGs before pushing. Count, don't assume.
- Only the 57 `.png` files are converted/backed-up. The ~7 pre-existing `images/*.jpg` (handwritten scan, the photo Gemini refused: `137_…`, `173_…handwritten`) stay untouched.
- Web resolution stays 1600px. Do not modify `copy-images.mjs` or `.github/workflows/`.
- JPEG spec for committed intermediates: sharp `.rotate().resize({ width: 2048, withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true })`.
- Delivery: draft PR on branch `feat/image-lfs-backup` (already checked out; spec already committed there).

---

### Task 1: Configure Git LFS tracking (before any PNG is staged)

**Files:**
- Create: `.gitattributes`

**Interfaces:**
- Produces: an active LFS filter for `images-original/*.png`, staged in the index.

- [ ] **Step 1: Create `.gitattributes`**

```
images-original/*.png filter=lfs diff=lfs merge=lfs -text
```

- [ ] **Step 2: Register the track rule and stage the attributes file**

Run:
```bash
git lfs track "images-original/*.png"
git add .gitattributes
git status --short .gitattributes
```
Expected: `.gitattributes` shows staged (`A` or `M`), and it contains the `filter=lfs` line for `images-original/*.png`.

- [ ] **Step 3: Commit the LFS configuration**

```bash
git commit -m "chore: track images-original/*.png in Git LFS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Migration script — convert PNGs to web JPEGs and move originals

**Files:**
- Create: `scripts/migrate-images-to-lfs.mjs`

**Interfaces:**
- Consumes: `images/*.png` (57 pristine PNGs).
- Produces: `images/<name>.jpg` for each; `images-original/<name>.png` for each; no `.png` left in `images/`.

- [ ] **Step 1: Write the migration script**

Create `scripts/migrate-images-to-lfs.mjs`:

```js
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// One-time migration: each sharpened PNG in images/ becomes a web-source JPEG
// (images/<name>.jpg, 2048px q88, rotation baked) and the pristine PNG moves to
// images-original/<name>.png (Git LFS cold backup). Pre-existing JPGs are untouched.
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
  const jpg = path.join(SRC, name.replace(/\.png$/i, '.jpg'));
  await sharp(png)
    .rotate()
    .resize({ width: MAX, withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(jpg);
  await rename(png, path.join(BACKUP, name));
  done += 1;
}
console.log(`Migrated ${done} PNG(s): images/*.jpg written, originals -> ${BACKUP}/`);
```

- [ ] **Step 2: Run the migration**

Run:
```bash
node scripts/migrate-images-to-lfs.mjs
```
Expected: `Migrated 57 PNG(s): images/*.jpg written, originals -> images-original/`

- [ ] **Step 3: Verify tree shape**

Run:
```bash
echo "png left in images/: $(ls images/*.png 2>/dev/null | wc -l | tr -d ' ')"
echo "png in images-original/: $(ls images-original/*.png | wc -l | tr -d ' ')"
echo "jpg in images/: $(ls images/*.jpg | wc -l | tr -d ' ')"
```
Expected: `png left in images/: 0`, `png in images-original/: 57`, `jpg in images/: 64` (57 new + 7 pre-existing).

- [ ] **Step 4: Commit the script**

```bash
git add scripts/migrate-images-to-lfs.mjs
git commit -m "feat: add one-time script migrating sharpened PNGs to web JPEGs + LFS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Stage images to LFS and verify the backup is correct

**Files:**
- Modify: working tree (`images/*.jpg`, `images-original/*.png`)

**Interfaces:**
- Consumes: the migrated trees from Task 2.
- Produces: 57 PNGs stored in LFS; the site builds; all references resolve.

- [ ] **Step 1: Stage originals (LFS) and regenerated JPEGs**

```bash
git add images-original/
git add images/
```

- [ ] **Step 2: PROOF GATE — all 57 PNGs are in LFS, not regular blobs**

Run:
```bash
git lfs ls-files | grep -c 'images-original/'
```
Expected: `57`. If not 57, STOP — a PNG is a regular blob. Run `git restore --staged images-original/`, confirm `.gitattributes` from Task 1 is committed and active (`git check-attr filter images-original/029_EID1234812_2p_p01_img1.png` → `filter: lfs`), then re-add.

- [ ] **Step 3: PROOF GATE — build + asset checks pass**

Run:
```bash
npm run check
```
Expected: PASS end to end. `check:blog-assets` confirms every frontmatter + inline reference resolves (this is the real validator — it covers refs the plan's greps miss, and will flag the Gemini-refused/handwritten JPGs if they went missing).

- [ ] **Step 4: PROOF GATE — web derivatives are small and the refused photo renders**

Run:
```bash
ls -lS public/images/*.jpg | head -3
ls -l public/images/137_EID1337229_7p_p06_img1.jpg public/images/173_EID1484917_handwritten*.jpg 2>/dev/null
```
Expected: largest derivatives are a few hundred KB (not multi-MB); the `137_…` and `173_…handwritten` JPGs exist in `public/images/`.

- [ ] **Step 5: Commit the migrated images**

```bash
git commit -m "feat: high-res photo backup in Git LFS, small JPEGs on web

Regenerate 57 sharpened photos as 2048px q88 web-source JPEGs in images/;
move pristine PNGs to images-original/ (Git LFS cold backup, never built
from or pulled by CI). Fixes broken image links from the PNG swap.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Push and open the draft PR

**Files:** none (git/gh operations)

- [ ] **Step 1: Push the branch**

Run:
```bash
git push -u origin feat/image-lfs-backup
```
Expected: push succeeds; LFS objects upload (~431MB, one-time). If LFS upload errors, do not force — report and stop.

- [ ] **Step 2: Open the draft PR**

```bash
gh pr create --draft --title "High-res photo backup in Git LFS, small JPEGs on web" --body "$(cat <<'EOF'
## What

Gemini-sharpened photos were dropped into `images/` as high-res PNGs (up to 10MB each, 431MB total), which both bloated the web payload and broke image links (content references `.jpg`, sources were `.png`).

This splits the two concerns:

- `images/*.jpg` — 57 web-source JPEGs regenerated from the PNGs (2048px, q88, rotation baked). Committed normally; drives the existing build; content references unchanged.
- `images-original/*.png` — the pristine PNGs in **Git LFS**, a cold backup the build never reads and CI never pulls (`actions/checkout` doesn't fetch LFS unless `lfs: true`).

The ~7 pre-existing JPGs (handwritten scan, the one photo Gemini refused) are untouched. `copy-images.mjs` and CI workflows are unchanged.

## Verify

- `git lfs ls-files` lists all 57 PNGs.
- `npm run check` passes.
- `public/images/*.jpg` derivatives are ~150–300KB.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: draft PR URL printed.

---

## Self-Review

**Spec coverage:** Backup location (LFS) → Task 1/3. Cold-backup build source → Task 2 (JPEGs drive build) + Task 3 Step 3. 2048px q88 intermediate → Task 2 Step 1. `.gitattributes` / no history rewrite → Task 1. No CI change → Global Constraints (enforced by not touching workflows). Migration ordering footgun → Task 1 before Task 3. Verification (ls-files, npm run check, spot-check, no png in images/) → Task 2 Step 3 + Task 3 Steps 2–4. Draft PR delivery → Task 4. All spec sections covered.

**Placeholder scan:** No TBD/TODO; every code and command step is concrete.

**Type consistency:** `images-original/` and 2048/q88 used identically across tasks; `git lfs ls-files` gate count (57) matches the migration count.
