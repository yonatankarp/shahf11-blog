# Memorial blog redesign — design spec

Date: 2026-07-04
Status: approved for planning

## Purpose

Replace the current visual design of the חיה בסרט(ן) archive with a fresh direction
("Direction A — חיה, בצבע"): a gentle memorial front door leading into a warm, in-color
archive that carries Haya's voice rather than a hushed, somber memorial. This is a
site-wide restyle plus two structural additions (a dedicated home page and a gallery page).

Mockup this spec is drawn from: the published artifact showing the memorial home, a post
reading view, and the people-and-tags search page.

## Design decisions already made (do not relitigate)

- **Fresh direction, not an elevation of the current look.** The current design (warm cream
  `#f4f2ed` + Frank Ruhl serif + wine accent) is deliberately retired.
- **Tone:** celebrate her voice — warm and in-color — but with a *gentle memorial front* and
  the energy *dialed back* (color as accent, not full-bleed; quiet hairlines, more air).
- **People are discovered via the tags-and-search page**, not surfaced on the home page.
- **Honesty constraints (hard):** do not invent Haya's birth/death years — only the 2008–2009
  blog years are shown. The hero is typographic; a portrait can slot in later. No fabricated data.

## Design system (tokens)

Defined once in `src/styles/global.css` under `:root`. Single committed light theme
(no dark theme — this is a deliberate commitment, matching the mockup).

```
--bg:    #f7efe3   /* warm oat ground (distinct from the retired cool cream) */
--panel: #fffaf1   /* cards, reading surface */
--ink:   #28201b   /* body text */
--mut:   #8a6c58   /* dates, secondary labels */
--red:   #c5384a   /* primary accent — the (ן), links, marks */
--gold:  #dca23a   /* hairlines, top rules */
--teal:  #127a70   /* topic tags */
--plum:  #833056   /* person tags */
--line:  #ecdcc7   /* soft warm rules */
```

Type roles (all Hebrew subsets, self-hosted via @fontsource, RTL throughout):

- **Display** — Secular One (`@fontsource/secular-one`): masthead/brand, post titles, section heads.
- **Body** — Frank Ruhl Libre Variable (already a dependency): all running prose.
- **Labels/UI** — Assistant Variable (already a dependency) for light labels; Heebo 700
  (`@fontsource/heebo`) for bold uppercase eyebrows and tag chips.

New font dependencies to add: `@fontsource/secular-one`, `@fontsource/heebo`.
Import them in `Base.astro` alongside the existing two.

Type scale (rem): hero title clamp(2.7,8vw,4); post title 2; card title 1.45; section head 1.3;
body 1.08; label 0.76–0.9. Keep running prose near the existing measure (~33–38rem).

## Page set and structure

The one structural change to routing: **the home page splits off from the archive.**
Today `/` is the paginated feed (`src/pages/[...page].astro`, pageSize 15). After this change:

| Route | Source file | What it is |
|---|---|---|
| `/` | **new** `src/pages/index.astro` | Memorial home (hero + dedication + recent-posts teaser) |
| `/archive`, `/archive/2`… | **moved** `src/pages/archive/[...page].astro` | The paginated feed (unchanged logic, restyled) |
| `/posts/[entryId]` | `src/pages/posts/[entryId].astro` | Post reading view (restyled) |
| `/tags` | `src/pages/tags/index.astro` | People + topics with live search (restyled; JS logic kept) |
| `/tags/[slug]` | `src/pages/tags/[slug].astro` | Posts for one tag (restyled) |
| `/about` | `src/pages/about.astro` | About (restyled) |
| `/gallery` | **new** `src/pages/gallery.astro` | Photo gallery — empty state for now (see below) |

`Base.astro` nav becomes: בית · ארכיון · אנשים ותגיות · גלריה · על הבלוג.
(אנשים ותגיות links to `/tags`.) Active link uses `--red`.

### Home (`/`) — the memorial front

- Eyebrow: `בלוג הזיכרון של חיה`.
- Title `חיה בסרט(ן)` in Secular One, the `(ן)` in `--red`.
- Voice quote (her tagline): `״הסרט שלי השנה: סרטן השד. האמונה שלי: השד לא נורא כל כך.״`
- Dedication (semi-formal, family voice): *בין 2008 ל־2009 כתבה כאן חיה על המחלה — בהומור,
  בכעס ובאומץ. הבלוג נשמר כאן במלואו, 182 רשומות, בקולה שלה. לזכרה, ובאהבה, ממשפחתה.*
- Meta line: `2008 — 2009 · 182 רשומות` (post count computed from the collection, not hardcoded).
- CTA button `קראו מההתחלה` → oldest post (or `/archive`; see open question).
- Below: a short "מהיומן" teaser of the most recent 2–3 posts (reusing the restyled card),
  with `כל הרשומות ←` → `/archive`. No people row.

### Archive (`/archive`) — paginated feed

Same pagination logic as today (`paginate(posts, { pageSize: 15 })`), moved under `/archive`.
Restyled cards; restyled pagination (`← ישנים יותר` / `חדשים יותר →`).

### Post reading view

- Restyle the existing `[entryId].astro`; keep all current behavior: adjacent-post nav, PDF
  download link, extra-images gallery, the `scan-truncated` note, TagChips.
- Category chip: `category` is almost always `כללי`, so render a single accent chip (or omit
  when empty) rather than the multi-color scheme shown in the mockup.
- Drop cap on the first body paragraph (`::first-letter`, floated right, `--red`).
- Gold top rule on the reading surface; tag chips row labelled `מוזכרים ברשומה:`.

### People & tags (`/tags`)

Keep the existing markup and inline search script (`data-search`, alias matching) — only
restyle: rounded warm search input, person chips (`--plum` border), topic chips (`--teal`),
counts muted. This already satisfies "find people by tags + search".

### Gallery (`/gallery`) — new

Read `gallery/photos.yaml`. It is currently `photos: []`, so render a gentle empty state
(e.g. *התמונות יתווספו בהמשך*). When photos exist later, render the manifest as a grid with
captions/credits. Requires a YAML read at build time (add a small parser dep or a minimal
inline parser; decide in the plan).

## Components touched

- `src/layouts/Base.astro` — new header/nav/footer; import the two new fonts.
- `src/components/PostCard.astro` — new card: date + (optional) category chip + Secular title
  + excerpt + `המשך קריאה ←`.
- `src/components/TagChips.astro` — restyle person/topic chips to the new tokens.
- `src/styles/global.css` — full rewrite around the new token system and per-page styles.

## Out of scope

- No new content, OCR, or tagging work. No topic-tag vocabulary expansion.
- No dark theme. No portrait/life-date content (slots only; family supplies later).
- No changes to the build/deploy pipeline beyond adding two font dependencies.

## Verification

- `npm run check` passes (blog-assets check, build, site-metadata check).
- `npm run visual:capture` (Playwright screenshots) to eyeball every page type in RTL.
- Manual: home, archive page 1 + a deeper page, a post (incl. one with images and one
  `scan-truncated`), `/tags` with search, a tag page, about, gallery empty state.

## Open questions for the plan

1. CTA `קראו מההתחלה` → the oldest post directly, or → `/archive`? (Leaning: oldest post,
   so "read from the beginning" is literal.)
2. Gallery YAML parsing approach — add `yaml`/`js-yaml` dep vs. a tiny inline parser for the
   simple manifest shape.
3. Keep `date_published` (the Hebrew string) as the displayed date, or format from `date`?
   (Leaning: keep `date_published` as-is, matching current behavior and provenance.)
