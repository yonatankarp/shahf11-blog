# Photo gallery

A gallery of photos of חיה, rendered at `/gallery/` alongside her writing and her video. This
folder holds the source photos and their captions as plain data. It is intentionally separate
from `images/`, which holds photos that were embedded *inside* individual blog posts. This
gallery is a standalone section about her.

## How to add photos

1. Drop the image files into `gallery/photos/`. Use simple ASCII filenames, no spaces or Hebrew
   in the filename (Hebrew belongs in the caption). For example `chaya-beach-1998.jpg`.
2. Add one entry per photo to `gallery/photos.yaml`, in the order you want them shown. The schema
   and an example are documented at the top of that file.
3. Run `npm run check:gallery-assets` to verify each manifest entry has a file, an accessible
   label, and no orphan gallery photos.

`npm run build` runs `scripts/copy-images.mjs`, which refreshes `public/gallery/photos/`,
`public/gallery/thumbs/`, and `public/gallery-dimensions.json` for the rendered gallery. Keep the
original files in `gallery/photos/`; `public/gallery/` is generated output.

## Notes

- Captions and dates are optional. A photo with no caption is fine.
- Keep the originals somewhere safe too; committing them here preserves them the same way the
  video and the scanned posts are preserved.
