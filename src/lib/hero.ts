import fs from 'node:fs';
import path from 'node:path';

// The homepage hero portrait, also the site-wide default og:image. To swap the
// photo, add the new file to public/ under a NEW filename and put that name first
// here — reusing an old filename leaves visitors' browser caches serving the
// previous photo inside the new layout.
const CANDIDATES = ['haya-face-red.jpg', 'haya-face.jpg', 'haya.jpg', 'haya.jpeg', 'haya.png', 'haya.webp'];

const PUB = path.join(process.cwd(), 'public');

export const heroPhotoFile: string | null =
  CANDIDATES.find((f) => fs.existsSync(path.join(PUB, f))) ?? null;
