# shahf11 — חיה בסרט(ן)

Archive of the Hebrew blog **חיה בסרט(ן)** by *shahf11*, originally published on tapuz.co.il
(2008–2009). The title is a pun: *חיה בסרט* ("living in a movie") with *סרטן* ("cancer") folded
into the parentheses. The blog documents the author's breast-cancer journey with humor.

The original posts were printed and scanned. This repository reconstructs them as text so the
blog can be rebuilt as a website, while keeping the scanned PDFs as downloadable originals.

## Layout

```
content/         Markdown page per post (YAML frontmatter + body). The future website pages.
posts-pdf/       Per-post scanned PDF, one file per post. Downloadable original source.
images/          Photos embedded in posts, deskewed. Referenced from each post's frontmatter.
gallery/         Standalone gallery of photos of חיה (photos/ + photos.yaml manifest). See gallery/README.md.
index.csv        Machine-readable index of all posts (order, EntryId, date, source location).
index.md         Human-readable index and scanning notes.
posts_to_rescan.md  The 9 "missing-page" posts were recovered (only the nav page was absent, not body). One post, 1280359, stays incomplete because its source printout was clipped on the left margin (not recoverable from a re-scan).
```

## Frontmatter

Each file in `content/` begins with:

```yaml
entryId:        original tapuz EntryId (stable id, used to chain multi-file posts)
title:          post title
date_published: publish date from the post's "פורסם ב…" line (Hebrew)
category:       post category
date_stamp:     the print-stamp date (differs from publish date)
source_url:     original tapuz print URL
source_scan:    which scan file and pages this came from
pages:          number of content pages
lang: he
images:         embedded image filenames, if any
review:         quality flags for pages that need a manual look, if any
```

## Provenance and accuracy

Text is OCR from the scans (tesseract, Hebrew). Body text is high fidelity; titles were read
with a vision model for accuracy. Dates and text may still contain OCR errors, so treat the
scanned PDF in `posts-pdf/` as the authoritative source when in doubt. Posts flagged in
`review` need a manual pass.

All 182 posts are archived here. (An earlier count held back 9 posts as "missing a page";
on review the absent page was in each case the trailing navigation page, not body text, so
they were recovered from the scans and added.) One archived post, 1280359, stays incomplete:
its source printout was clipped on the left margin, so some line-starts are absent and cannot be
recovered from a re-scan. See `posts_to_rescan.md`.
