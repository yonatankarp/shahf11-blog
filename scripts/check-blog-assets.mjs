#!/usr/bin/env node
// Source-side check: every image a post references (frontmatter `images:` or an
// inline ![](images/…) body link) must exist as a file in images/. Runs before
// the build, so authoring mistakes fail fast instead of shipping a broken <img>.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(rootDir, 'content');
const imagesDir = path.join(rootDir, 'images');

const toFilename = (ref) => {
  const clean = ref.split(/[?#]/, 1)[0];
  const m = clean.match(/images\/(.+)$/);
  return m ? m[1] : clean;
};

const frontMatterImages = (fm) => {
  const line = fm.match(/^images:[ \t]*(.*)$/m);
  if (!line) return [];
  const inline = line[1].trim();
  if (inline.startsWith('[')) {
    return inline
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  // YAML block list on the lines following `images:`
  const after = fm.slice(fm.indexOf(line[0]) + line[0].length);
  const items = [];
  for (const l of after.split(/\r?\n/)) {
    const im = l.match(/^[ \t]*-[ \t]*(.+?)[ \t]*$/);
    if (im) items.push(im[1].replace(/^["']|["']$/g, ''));
    else if (l.trim() && !/^[ \t]/.test(l)) break; // next top-level key
  }
  return items;
};

const bodyImagePattern = /!\[[^\]]*\]\([ \t]*<?((?:\.\.\/)?images\/[^)\s>]+)>?/g;

const files = (await readdir(contentDir)).filter((f) => f.endsWith('.md')).sort();
const missing = [];
let refCount = 0;

for (const file of files) {
  const content = await readFile(path.join(contentDir, file), 'utf8');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fm = fmMatch ? fmMatch[1] : '';
  const body = fmMatch ? fmMatch[2] : content;

  const refs = new Set();
  for (const f of frontMatterImages(fm)) refs.add(toFilename(f));
  for (const m of body.matchAll(bodyImagePattern)) refs.add(toFilename(m[1]));

  for (const r of refs) {
    refCount += 1;
    if (!existsSync(path.join(imagesDir, r))) missing.push(`${file}: ${r}`);
  }
}

if (missing.length > 0) {
  console.error('Missing image assets referenced by posts:');
  for (const m of missing) console.error(`- ${m}`);
  process.exit(1);
}

console.log(`All ${refCount} image references across ${files.length} posts exist in images/.`);
