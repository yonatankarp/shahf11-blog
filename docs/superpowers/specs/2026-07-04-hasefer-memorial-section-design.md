# הספר — memorial book section, homepage bio, gallery photos, PDF downloads

Date: 2026-07-04
Status: approved (design), pending implementation plan

## Goal

Add the newly-recovered material from the printed memorial book *"חיה בסרט(ן)" by חיה קרפ-צור*
(Ofir Bikurim) to the site. Source material lives in `~/Downloads/mom` (a Google Drive export of
the book's production package). This spec covers what to add, where, and how, following the site's
existing patterns.

## Scope

In scope:
- A short biographical prose section on the homepage.
- A new `הספר` page holding Haya's handwritten preface, the three children's tributes, and the
  book description.
- Two downloadable PDFs (the finished book, the מידף community memorial issue).
- New gallery photos: dedup the 62 scans against the existing 55 and add only the new ones.

Explicitly out of scope / never published (private material in the source folder):
- `Haya-ID.jpg` (identity document), medical lab PDFs (`newmed…`, `DDL…`, `J1771559`), iStore
  receipts, and the ACUM copyright form. These stay untouched and off the site.

## Source-to-destination mapping

| Source file (`~/Downloads/mom/`) | Destination |
|---|---|
| `הקדמה.doc` (family foreword, typed) — biographical half | homepage prose section |
| `הקדמה.doc` — book-genesis half | `הספר` page, intro lead-in |
| `Page1.jpg`, `Page2.jpg` (Haya's handwritten preface) | `הספר` page, scans + transcription |
| `מכתבים של הילדים.doc` (letters: שחף, יונתן) | `הספר` page, letters |
| `מחכה שתעני לי - נעמה צור.doc` (Naama's poem) | `הספר` page, after the letters |
| `כריכה אחורית.doc` (back-cover blurb) | `הספר` page, book description in downloads block |
| `Cover-Haya.jpg` (book cover incl. portrait) | `הספר` page, cover image beside downloads |
| `חיה בסרטן - חיה קרפ-צור.pdf` (finished book) | committed `book/` dir → GitHub-raw download |
| `מידף לזכרה של חיה.pdf` (community memorial issue #725) | committed `book/` dir → GitHub-raw download |
| `תמונות/Scan_0000..0061.jpg` (62 scans) | dedup vs gallery, add new → `gallery/photos/` + `photos.yaml` |

## Foreword split (הקדמה.doc)

The family's typed foreword has two halves. Homepage gets the biography; the book page gets the
genesis, because it introduces the handwritten preface.

- **Homepage (biography):** diagnosed breast cancer August 2007 at age 41; blogged through the
  illness with humour so other patients could find the eye-level information she couldn't; touched
  dozens of online friends (she sometimes called herself שחף); died May 2010.
- **`הספר` page (genesis):** her dream was to publish the blog as a book; she only managed to write
  the preface before she died, so the family published her writing and reproduced her preface in
  her own hand.

Attested life dates (from the מידף cover, for factual grounding): born 28.6.1966, died 19.5.2010.
Do not invent any biographical facts beyond what these sources attest.

## Pages and structure

### Homepage (`src/pages/index.astro`)
Add one short prose section after `.home-hero` and before `.home-film` ("הסרט שלה"), containing
the biographical half of the foreword. Keep it tight — a couple of sentences to a short paragraph.
Do not duplicate the hero's existing dedication line.

### New page (`src/pages/book.astro`), nav label `הספר`
Add `{ href: 'book', label: 'הספר' }` to the `nav` array in `src/layouts/Base.astro`, positioned
between `gallery` and `about`.

Page order, top to bottom:
1. **Genesis intro** — book-genesis half of the foreword, as the lead-in to the preface.
2. **Haya's handwritten preface** — `Page1.jpg` and `Page2.jpg` shown as images, with a Hebrew
   transcription rendered beneath, labelled `תמליל לאימות` (transcription pending verification).
   Illegible words are marked, never guessed. Pairing the image with text gives search and
   screen-reader access. The transcription stays flagged until the user confirms it.
3. **Letters** — headed sections in order: שחף, then יונתן, then נעמה's poem. Full text inline
   (memorial content is meant to be read, not collapsed).
4. **Downloads** — the finished book PDF and the מידף PDF, with the back-cover blurb as the book's
   short description and `Cover-Haya.jpg` shown alongside.

## Asset placement (follows existing patterns)

- **Page images** (preface scans, cover): add to the repo-root `images/` directory with clear
  ASCII names. `scripts/copy-images.mjs` syncs `images/` → `public/images/` on dev/build; reference
  them from the `.astro` page with `withBase('images/<name>.jpg')`.
- **Downloadable PDFs**: commit to a new repo-root `book/` directory and link via GitHub raw
  (`https://github.com/yonatankarp/shahf11-blog/raw/main/book/<file>.pdf`), exactly as
  `src/pages/posts/[entryId].astro` does for `posts-pdf/`. This keeps ~8.5 MB out of the built
  site. Use ASCII filenames for the committed PDFs.
- **Gallery photos**: add new (deduped) images to `gallery/photos/` with ASCII names and one entry
  each in `gallery/photos.yaml`. `copy:images` syncs to `public/gallery/photos/`.

## Gallery dedup approach

The 62 scans (`תמונות/Scan_*.jpg`, scanned physical prints) and the existing 55 gallery photos
(digital, credited `Photos-3-001 / …`) are likely largely distinct sets, but must be compared
visually before adding, to avoid duplicates. Only genuinely-new photos are added. Report how many
were added and how many were skipped as duplicates.

## Styling

Reuse existing styles where possible (`.about` article styles, gallery styles). Add scoped or
`global.css` styles for the new preface (two-up scans + transcription) and letters layout, matching
the site's existing typographic, RTL, Hebrew-font aesthetic. No new fonts.

## Verification

- `npm run check` stays green (runs blog-asset check, gallery-asset check, build, metadata check).
- New nav item renders and is active on `/book`.
- Preface scans load; transcription present and clearly marked for verification.
- Both PDF links resolve to the committed files (raw URLs valid once pushed).
- Gallery shows the added photos; no duplicates; asset check passes.
- Memorial-accuracy guard: quoted text (letters, poem, blurb, foreword) matches the source `.doc`
  files byte-for-byte after extraction; no invented content anywhere.

## Open items for the user

- Verify the handwritten-preface transcription against the scans before it is considered final.
- Confirm any publisher (Ofir Bikurim) agreement does not restrict hosting the full book PDF
  (family owns the writing; noted as low risk).
