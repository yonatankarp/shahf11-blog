#!/usr/bin/env node
// Source-side check: every image a post references (frontmatter `images:` or an
// inline ![](images/…) body link) must exist as a file in images/. Every post
// must also keep its matching scanned PDF in public/posts-pdf/. Runs before the
// build, so authoring/provenance mistakes fail fast instead of shipping a broken
// archive.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(rootDir, 'content');
const imagesDir = path.join(rootDir, 'images');
const pdfDir = path.join(rootDir, 'public', 'posts-pdf');

const toFilename = (ref) => {
  const clean = ref.split(/[?#]/, 1)[0];
  const m = clean.match(/images\/(.+)$/);
  return m ? m[1] : clean;
};

const frontMatterImages = (fm, file) => {
  if (!fm.trim()) return [];
  let frontmatter;
  try {
    frontmatter = loadYaml(fm) ?? {};
  } catch (error) {
    throw new Error(`${file}: invalid frontmatter YAML: ${error.message}`);
  }
  const images = frontmatter.images ?? [];
  if (!Array.isArray(images)) throw new Error(`${file}: frontmatter images must be a YAML list`);
  return images.map(String).filter(Boolean);
};

const bodyImagePattern = /!\[[^\]]*\]\([ \t]*<?((?:\.\.\/)?images\/[^)\s>]+)>?/g;

const files = (await readdir(contentDir)).filter((f) => f.endsWith('.md')).sort();
const missing = [];
const missingPdfs = [];
let refCount = 0;

for (const file of files) {
  const content = await readFile(path.join(contentDir, file), 'utf8');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fm = fmMatch ? fmMatch[1] : '';
  const body = fmMatch ? fmMatch[2] : content;

  const refs = new Set();
  for (const f of frontMatterImages(fm, file)) refs.add(toFilename(f));
  for (const m of body.matchAll(bodyImagePattern)) refs.add(toFilename(m[1]));

  for (const r of refs) {
    refCount += 1;
    if (!existsSync(path.join(imagesDir, r))) missing.push(`${file}: ${r}`);
  }

  const pdfFile = file.replace(/\.md$/, '.pdf');
  const pdfPath = path.join(pdfDir, pdfFile);
  if (!existsSync(pdfPath) || !statSync(pdfPath).isFile()) missingPdfs.push(`${file}: ${pdfFile}`);
}

if (missing.length > 0) {
  console.error('Missing image assets referenced by posts:');
  for (const m of missing) console.error(`- ${m}`);
  process.exit(1);
}

if (missingPdfs.length > 0) {
  console.error('Missing scanned PDFs for posts:');
  for (const m of missingPdfs) console.error(`- ${m}`);
  process.exit(1);
}

console.log(`All ${refCount} image references and ${files.length} scanned PDFs across ${files.length} posts exist.`);
