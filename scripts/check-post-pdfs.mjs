#!/usr/bin/env node
// Source-side provenance check: every content post should keep its matching
// scanned PDF in public/posts-pdf/, and every archived PDF should map back to a
// post. The retained Tapuz print URL must also point at the same entry id. This
// guards the archival source files without exposing scan metadata in
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
let sourceUrlCount = 0;

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
  if (!data.source_url) {
    failures.push(`${file}: missing source_url provenance`);
  } else {
    try {
      const sourceUrl = new URL(data.source_url);
      sourceUrlCount += 1;
      if (sourceUrl.searchParams.get('EntryId') !== data.entryId) {
        failures.push(`${file}: source_url EntryId does not match frontmatter entryId ${data.entryId}`);
      }
    } catch {
      failures.push(`${file}: source_url is not a valid URL`);
    }
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

console.log(`All ${postFiles.length} posts have matching archival PDFs and source URLs; no orphan PDFs found. Checked ${sourceUrlCount} source URLs.`);
