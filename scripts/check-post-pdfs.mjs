#!/usr/bin/env node
// Source-side provenance check: every content post should keep its matching
// scanned PDF in public/posts-pdf/, and every archived PDF should map back to a
// post. This guards the archival source files without exposing scan metadata in
// reader-facing post content.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(rootDir, 'content');
const pdfDir = path.join(rootDir, 'public', 'posts-pdf');

const postFiles = (await readdir(contentDir)).filter((f) => f.endsWith('.md')).sort();
const pdfFiles = (await readdir(pdfDir)).filter((f) => f.endsWith('.pdf')).sort();
const postPdfNames = new Set(postFiles.map((f) => f.replace(/\.md$/, '.pdf')));
const failures = [];

for (const file of postFiles) {
  const content = await readFile(path.join(contentDir, file), 'utf8');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    failures.push(`${file}: missing YAML frontmatter`);
    continue;
  }

  const data = loadYaml(fmMatch[1]);
  const expectedPdf = file.replace(/\.md$/, '.pdf');
  if (!existsSync(path.join(pdfDir, expectedPdf))) {
    failures.push(`${file}: missing archival PDF public/posts-pdf/${expectedPdf}`);
  }
  if (!file.includes(`EID${data.entryId}`)) {
    failures.push(`${file}: filename does not include frontmatter entryId ${data.entryId}`);
  }
  if (!data.source_scan) {
    failures.push(`${file}: missing source_scan provenance`);
  }
  if (!Number.isInteger(data.pages) || data.pages < 1) {
    failures.push(`${file}: pages must be a positive integer`);
  }
}

for (const file of pdfFiles) {
  if (!postPdfNames.has(file)) {
    failures.push(`public/posts-pdf/${file}: no matching content post`);
  }
}

if (failures.length > 0) {
  console.error('Post PDF provenance check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`All ${postFiles.length} posts have matching archival PDFs; no orphan PDFs found.`);
