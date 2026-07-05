# הספר Memorial Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the recovered memorial-book material (Haya's handwritten preface, the three children's tributes, book description) as a new `הספר` page, a short biography on the homepage, two downloadable PDFs, and the new gallery photos.

**Architecture:** Astro static site. New `src/pages/book.astro` page + a nav entry in `src/layouts/Base.astro` + a prose section added to `src/pages/index.astro`. Page images live in repo-root `images/` (synced to `public/images/` by `scripts/copy-images.mjs`); large PDFs are committed to a repo-root `book/` dir and linked via GitHub raw, exactly like `posts-pdf/`. Gallery photos are added to `gallery/photos/` + `gallery/photos.yaml`.

**Tech Stack:** Astro 7, `.astro` components, `global.css`, `js-yaml`, `withBase()` URL helper, macOS `textutil` for `.doc` extraction.

## Global Constraints

- Base path is `/shahf11-blog`; site is `https://yonatankarp.com`. Always build links with `withBase(...)` from `src/lib/url.ts`. (astro.config.mjs)
- Language/dir: page is `lang="he" dir="rtl"`. All new copy is Hebrew.
- Memorial-accuracy guard: all quoted text (foreword, letters, poem, back-cover blurb) MUST be extracted from the source `.doc` files, not retyped. The handwritten preface transcription is the one exception — it is transcribed from the scans, marked `תמליל לאימות`, illegible words bracketed, never guessed. Invent nothing.
- Private material stays off the site: `Haya-ID.jpg`, medical/lab PDFs, receipts, ACUM form. Do not copy them into the repo.
- Asset filenames committed to the repo are ASCII only; Hebrew belongs in captions/alt/body, never filenames.
- Verification gate for every task: `npm run check` (runs `check:blog-assets`, `check:gallery-assets`, `build`, `check:site-metadata`) must pass. There is no unit-test framework; the build + asset checks + visual inspection are the gate.
- Commit only on the feature branch. Source folder is `~/Downloads/mom`.

---

### Task 0: Branch and scaffold the הספר page + nav

**Files:**
- Modify: `src/layouts/Base.astro:16-22` (nav array)
- Create: `src/pages/book.astro`

**Interfaces:**
- Produces: route `/shahf11-blog/book`, nav label `הספר`, `book.astro` with empty labelled sections that later tasks fill.

- [ ] **Step 1: Create the feature branch**

```bash
git checkout main
git pull
git checkout -b feat/hasefer-memorial-section
```

- [ ] **Step 2: Add the nav entry**

In `src/layouts/Base.astro`, insert between the `gallery` and `about` entries:

```js
const nav = [
  { href: '/', label: 'בית' },
  { href: 'blog', label: 'הבלוג' },
  { href: 'tags', label: 'חיפוש' },
  { href: 'gallery', label: 'גלריה' },
  { href: 'book', label: 'הספר' },
  { href: 'about', label: 'על הבלוג' },
];
```

- [ ] **Step 3: Create the page shell**

Create `src/pages/book.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import { withBase } from '../lib/url';
---
<Base title="הספר — חיה בסרט(ן)" description="הספר 'חיה בסרט(ן)' מאת חיה קרפ-צור: הקדמתה בכתב ידה, מכתבי המשפחה, והספר להורדה.">
  <article class="book-page">
    <h1>הספר</h1>
    <section class="book-genesis" aria-label="הקדמה"></section>
    <section class="book-preface" aria-label="ההקדמה בכתב ידה של חיה"></section>
    <section class="book-letters" aria-label="מכתבי המשפחה"></section>
    <section class="book-downloads" aria-label="להורדה"></section>
  </article>
</Base>
```

- [ ] **Step 4: Build and verify nav + route**

Run: `npm run build`
Expected: build succeeds; `dist/book/index.html` exists and the nav shows `הספר`.

```bash
test -f dist/book/index.html && grep -q 'הספר' dist/book/index.html && echo OK
```

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Base.astro src/pages/book.astro
git commit -m "feat: scaffold הספר page and nav entry"
```

---

### Task 1: Homepage biography section

**Files:**
- Modify: `src/pages/index.astro` (add a section between `.home-hero` and `.home-film`)
- Modify: `src/styles/global.css` (styles for the new section)
- Reference (extract text, do not copy file): `~/Downloads/mom/הקדמה.doc`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: `.home-story` section on the homepage.

- [ ] **Step 1: Extract the foreword text to confirm wording**

Run:
```bash
textutil -convert txt -stdout ~/Downloads/mom/הקדמה.doc
```
Expected: the family foreword. Use the biographical sentences (diagnosis Aug 2007 at 41; blogged with humour so other patients could find eye-level information; touched dozens of online friends, sometimes called herself שחף; died May 2010). Do NOT use the book-genesis sentences here (those go to Task 2).

- [ ] **Step 2: Add the section markup**

In `src/pages/index.astro`, immediately after the closing `</section>` of `.home-hero` and before `<section class="home-film">`, insert. Use the exact biographical wording from the source (paraphrase only for flow between homepage and hero, keep facts verbatim):

```astro
  <section class="home-story" aria-label="על חיה">
    <p>באוגוסט 2007, בת 41, גילתה חיה שהיא חולה בסרטן השד. לאורך המחלה כתבה כאן בלוג — בהומור ובקלילות — כדי שחולים אחרים ימצאו את המידע בגובה העיניים שהיא עצמה התקשתה למצוא. בכתיבתה נגעה בעשרות חברים ברשת (לעיתים קראה לעצמה שחף). במאי 2010 נפטרה, לאחר מלחמה ארוכה במחלה.</p>
  </section>
```

Note: verify each clause against the Step 1 output before saving; adjust wording only to match the source facts.

- [ ] **Step 3: Add styling**

In `src/styles/global.css`, add (matching the site's centered, readable prose rhythm):

```css
.home-story {
  max-width: 60ch;
  margin: 2.5rem auto;
  text-align: center;
  line-height: 1.9;
  color: var(--ink, #2b2b2b);
}
```
If `--ink` is not a defined token, drop the `color` line rather than invent a token — check `global.css` first.

- [ ] **Step 4: Build and verify**

Run: `npm run check`
Expected: passes. Then confirm the homepage renders the paragraph:
```bash
grep -q 'גילתה חיה שהיא חולה' dist/index.html && echo OK
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro src/styles/global.css
git commit -m "feat: add short biography section to homepage"
```

---

### Task 2: Genesis intro + handwritten preface on הספר

**Files:**
- Copy in: `~/Downloads/mom/Page1.jpg` → `images/book-preface-p1.jpg`, `Page2.jpg` → `images/book-preface-p2.jpg`
- Modify: `src/pages/book.astro` (`.book-genesis` and `.book-preface` sections)
- Modify: `src/styles/global.css` (preface layout)

**Interfaces:**
- Consumes: page shell from Task 0.
- Produces: rendered genesis prose + two preface scans + transcription block.

- [ ] **Step 1: Copy the preface scans into `images/`**

```bash
cp ~/Downloads/mom/Page1.jpg images/book-preface-p1.jpg
cp ~/Downloads/mom/Page2.jpg images/book-preface-p2.jpg
```

- [ ] **Step 2: Extract the genesis text**

Run: `textutil -convert txt -stdout ~/Downloads/mom/הקדמה.doc`
Use the book-genesis sentences: her dream was to publish the blog as a book; she only managed to write the preface before she died; the family published her writing and reproduced her preface in her own hand.

- [ ] **Step 3: Transcribe the handwritten preface**

Read `images/book-preface-p1.jpg` and `images/book-preface-p2.jpg` carefully. Produce a faithful Hebrew transcription. Bracket any word you cannot read with `[…]`. Do NOT guess. This text will be shown under a `תמליל לאימות` label for the user to verify.

- [ ] **Step 4: Fill the genesis + preface sections**

In `src/pages/book.astro`, replace the empty `.book-genesis` and `.book-preface` sections:

```astro
    <section class="book-genesis" aria-label="הקדמה">
      <p>חלומה של חיה היה להוציא את תכני הבלוג לאור כספר. בעודה בחיים הספיקה לכתוב רק את ההקדמה לספר; מתוך רצון להגשים את חלומה, בני משפחתה הוציאו את רישומיה כספר, וצירפו את הקדמתה בכתב ידה המקורי — כפי שמובאת כאן.</p>
    </section>

    <section class="book-preface" aria-label="ההקדמה בכתב ידה של חיה">
      <h2>ההקדמה, בכתב ידה של חיה</h2>
      <div class="preface-scans">
        <img src={withBase('images/book-preface-p1.jpg')} alt="עמוד ראשון של ההקדמה בכתב ידה של חיה" loading="lazy" />
        <img src={withBase('images/book-preface-p2.jpg')} alt="עמוד שני של ההקדמה בכתב ידה של חיה" loading="lazy" />
      </div>
      <div class="preface-transcript">
        <p class="preface-transcript__label">תמליל לאימות</p>
        <!-- Transcription from Step 3 goes here, one <p> per paragraph, [ ] for illegible words -->
      </div>
    </section>
```
Insert the Step 3 transcription inside `.preface-transcript` (one `<p>` per paragraph). Confirm the genesis wording matches Step 2 output.

- [ ] **Step 5: Add styling**

In `src/styles/global.css`:

```css
.book-page { max-width: 72ch; margin: 0 auto; }
.book-genesis { line-height: 1.9; margin: 1.5rem 0 2.5rem; }
.preface-scans { display: grid; gap: 1rem; grid-template-columns: 1fr; }
@media (min-width: 720px) { .preface-scans { grid-template-columns: 1fr 1fr; } }
.preface-scans img { width: 100%; height: auto; border: 1px solid rgba(0,0,0,.1); border-radius: 4px; }
.preface-transcript { margin-top: 1.5rem; line-height: 1.9; }
.preface-transcript__label { font-size: .85rem; opacity: .7; letter-spacing: .02em; }
```

- [ ] **Step 6: Build and verify**

Run: `npm run check`
Expected: passes (blog-asset/gallery-asset checks unaffected; build copies `images/` → `public/images/`). Confirm scans referenced:
```bash
grep -q 'book-preface-p1.jpg' dist/book/index.html && echo OK
```

- [ ] **Step 7: Commit**

```bash
git add images/book-preface-p1.jpg images/book-preface-p2.jpg src/pages/book.astro src/styles/global.css
git commit -m "feat: add genesis intro and handwritten preface to הספר"
```

---

### Task 3: Family letters and Naama's poem

**Files:**
- Modify: `src/pages/book.astro` (`.book-letters` section)
- Modify: `src/styles/global.css` (letters layout)
- Reference (extract, do not copy): `~/Downloads/mom/מכתבים של הילדים.doc`, `~/Downloads/mom/מחכה שתעני לי - נעמה צור.doc`

**Interfaces:**
- Consumes: page shell.
- Produces: three headed blocks (שחף, יונתן, נעמה's poem) with full text.

- [ ] **Step 1: Extract the letters and poem verbatim**

```bash
textutil -convert txt -stdout "$HOME/Downloads/mom/מכתבים של הילדים.doc" > "$CLAUDE_JOB_DIR/tmp/letters.txt"
textutil -convert txt -stdout "$HOME/Downloads/mom/מחכה שתעני לי - נעמה צור.doc" > "$CLAUDE_JOB_DIR/tmp/poem.txt"
```
The letters file contains `המכתב של שחף:` then Shahaf's letter, then `המכתב של יונתן:` then Yonatan's. The poem file is Naama's `מחכה שתעני לי`.

- [ ] **Step 2: Fill the letters section**

In `src/pages/book.astro`, replace the empty `.book-letters`. Paste the extracted text verbatim, one `<p>` per paragraph. Structure:

```astro
    <section class="book-letters" aria-label="מכתבי המשפחה">
      <h2>מכתבי המשפחה</h2>

      <article class="letter">
        <h3>המכתב של שחף</h3>
        <!-- Shahaf's letter paragraphs, verbatim from letters.txt -->
      </article>

      <article class="letter">
        <h3>המכתב של יונתן</h3>
        <!-- Yonatan's letter paragraphs, verbatim from letters.txt -->
      </article>

      <article class="letter letter--poem">
        <h3>מחכה שתעני לי — נעמה</h3>
        <!-- Naama's poem lines, verbatim from poem.txt, each line its own line -->
      </article>
    </section>
```
For the poem, preserve line breaks (use `<p>` per stanza with `<br />` between lines, or a `<pre>`-free stanza layout).

- [ ] **Step 3: Add styling**

In `src/styles/global.css`:

```css
.book-letters { margin-top: 3rem; }
.letter { margin: 2.5rem 0; line-height: 1.9; }
.letter h3 { margin-bottom: .75rem; }
.letter--poem { text-align: center; font-style: italic; white-space: normal; }
.letter--poem p { margin: 1rem 0; }
```

- [ ] **Step 4: Verify text fidelity**

Confirm the rendered paragraphs match the source extraction (no dropped or invented lines):
```bash
grep -c 'letter' dist/book/index.html
```
Spot-check a distinctive phrase from each letter against `letters.txt`/`poem.txt`.

- [ ] **Step 5: Build and commit**

Run: `npm run check` (expected pass), then:
```bash
git add src/pages/book.astro src/styles/global.css
git commit -m "feat: add family letters and Naama's poem to הספר"
```

---

### Task 4: Downloads — book + מידף PDFs, blurb, cover

**Files:**
- Create dir + copy in: `~/Downloads/mom/חיה בסרטן - חיה קרפ-צור.pdf` → `book/haya-basrat-an-book.pdf`; `~/Downloads/mom/מידף לזכרה של חיה.pdf` → `book/meydaf-memorial-725.pdf`
- Copy in: `~/Downloads/mom/Cover-Haya.jpg` → `images/book-cover.jpg`
- Modify: `src/pages/book.astro` (`.book-downloads` section)
- Modify: `src/styles/global.css` (downloads layout)
- Reference (extract): `~/Downloads/mom/כריכה אחורית.doc`

**Interfaces:**
- Consumes: page shell.
- Produces: downloads block with two GitHub-raw links, blurb, cover image.

- [ ] **Step 1: Copy PDFs and cover into the repo**

```bash
mkdir -p book
cp "$HOME/Downloads/mom/חיה בסרטן - חיה קרפ-צור.pdf" book/haya-basrat-an-book.pdf
cp "$HOME/Downloads/mom/מידף לזכרה של חיה.pdf" book/meydaf-memorial-725.pdf
cp "$HOME/Downloads/mom/Cover-Haya.jpg" images/book-cover.jpg
```

- [ ] **Step 2: Extract the back-cover blurb**

Run: `textutil -convert txt -stdout "$HOME/Downloads/mom/כריכה אחורית.doc"`
Use verbatim as the book's short description.

- [ ] **Step 3: Fill the downloads section**

In `src/pages/book.astro`, replace the empty `.book-downloads`. PDFs are linked via GitHub raw (branch `main`), matching `src/pages/posts/[entryId].astro:16`:

```astro
    <section class="book-downloads" aria-label="להורדה">
      <h2>הספר להורדה</h2>
      <div class="book-download-card">
        <img class="book-cover" src={withBase('images/book-cover.jpg')} alt="כריכת הספר 'חיה בסרט(ן)' מאת חיה קרפ-צור" loading="lazy" />
        <div class="book-download-card__body">
          <!-- back-cover blurb paragraphs, verbatim from Step 2 -->
          <p class="book-downloads__links">
            <a href="https://github.com/yonatankarp/shahf11-blog/raw/main/book/haya-basrat-an-book.pdf">הורדת הספר המלא (PDF)</a>
            <a href="https://github.com/yonatankarp/shahf11-blog/raw/main/book/meydaf-memorial-725.pdf">מידף לזכרה של חיה — גיליון הקהילה (PDF)</a>
          </p>
        </div>
      </div>
    </section>
```

- [ ] **Step 4: Add styling**

In `src/styles/global.css`:

```css
.book-downloads { margin-top: 3rem; }
.book-download-card { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: flex-start; }
.book-cover { width: 200px; max-width: 40%; height: auto; border-radius: 4px; box-shadow: 0 2px 12px rgba(0,0,0,.15); }
.book-download-card__body { flex: 1 1 16rem; line-height: 1.9; }
.book-downloads__links { display: flex; flex-direction: column; gap: .5rem; margin-top: 1rem; }
```

- [ ] **Step 5: Build and verify links + assets**

Run: `npm run check` (expected pass). Confirm the committed files and references exist:
```bash
test -f book/haya-basrat-an-book.pdf && test -f book/meydaf-memorial-725.pdf && test -f images/book-cover.jpg && echo FILES_OK
grep -q 'meydaf-memorial-725.pdf' dist/book/index.html && echo LINK_OK
```
Note: the raw URLs resolve only after the branch is pushed and merged to `main`; the file paths under `book/` are what must be correct now.

- [ ] **Step 6: Commit**

```bash
git add book/ images/book-cover.jpg src/pages/book.astro src/styles/global.css
git commit -m "feat: add book and מידף PDF downloads to הספר"
```

---

### Task 5: Gallery — dedup the 62 scans and add the new ones

**Files:**
- Copy in (new only): `~/Downloads/mom/תמונות/Scan_00NN.jpg` → `gallery/photos/haya-gallery-0NN.jpg` (continuing the existing numbering)
- Modify: `gallery/photos.yaml` (one entry per added photo)

**Interfaces:**
- Consumes: existing gallery (`gallery/photos/`, 55 images; `gallery/photos.yaml`).
- Produces: added gallery entries; a count of added vs skipped-as-duplicate.

- [ ] **Step 1: Inventory both sets**

```bash
ls ~/Downloads/mom/תמונות/ | wc -l   # 62 scans
ls gallery/photos/*.jpg | wc -l       # existing 55
```

- [ ] **Step 2: Visually dedup**

Read the 62 scans and compare against the 55 existing `gallery/photos/*.jpg`. Because the two sets come from different sources (scanned prints vs digital `Photos-3-001` export), expect them to be largely distinct, but confirm visually. Build the list of scans NOT already present. This is the one step to dispatch to a subagent if desired (return: list of new scan filenames). Do not add duplicates.

- [ ] **Step 3: Copy the new scans with ASCII names**

For each new scan, continue the existing numbering (`haya-gallery-056.jpg`, `057`, …):
```bash
cp ~/Downloads/mom/תמונות/Scan_00XX.jpg gallery/photos/haya-gallery-0NN.jpg
```

- [ ] **Step 4: Add manifest entries**

Append to `gallery/photos.yaml` under `photos:`, one per added file, matching the existing schema:
```yaml
  - file: haya-gallery-0NN.jpg
    alt: "תמונה של חיה"
    credit: "Scan_00XX.jpg"
```
`alt` is required by the gallery-asset check; `caption` optional. Keep `credit` traceable to the source scan.

- [ ] **Step 5: Verify gallery assets and build**

Run: `npm run check`
Expected: `check:gallery-assets` passes (every `photos.yaml` file exists on disk and vice-versa), build succeeds.

- [ ] **Step 6: Commit**

```bash
git add gallery/photos/ gallery/photos.yaml
git commit -m "feat: add newly-recovered photos to the gallery"
```

---

### Task 6: Final full-site verification

**Files:** none (verification only)

- [ ] **Step 1: Full check**

Run: `npm run check`
Expected: all four sub-checks pass and the build is green.

- [ ] **Step 2: Visual pass (dev server)**

Run `npm run dev`, then load `/shahf11-blog/`, `/shahf11-blog/book`, `/shahf11-blog/gallery`. Confirm: homepage bio reads correctly; `הספר` shows genesis → preface scans + transcription → letters → poem → downloads with cover; nav highlights `הספר`; gallery shows the new photos.

- [ ] **Step 3: Accuracy spot-check**

Diff a distinctive line from each letter/poem/blurb against the `textutil` extraction of its source `.doc`. Confirm nothing invented and no private files were copied into the repo (`git status` shows no ID/medical/receipt files).

---

## Self-review notes

- **Spec coverage:** homepage bio (Task 1), genesis + preface (Task 2), letters + poem (Task 3), downloads + blurb + cover (Task 4), gallery dedup (Task 5), verification/accuracy guard (Task 6), nav + page scaffold (Task 0). All spec sections covered.
- **Open user item:** the preface transcription (Task 2, Step 3) ships marked `תמליל לאימות` for the user to verify — this is intentional per the spec, not a placeholder.
- **Filenames:** confirm exact source filenames with `ls ~/Downloads/mom` before copying (Hebrew filenames must be quoted in shell).
