#!/usr/bin/env node
// Visual smoke: build must already be in dist/. Serves it with `astro preview`,
// then screenshots a few representative routes (home, a post with an image,
// about) at desktop + mobile. Not a pixel-diff — the screenshots are uploaded as
// a CI artifact for a quick human eyeball, and any route that fails to load 2xx
// fails the job. Mirrors yonatankarp.github.io's visual:capture.
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const screenshotDir = path.join(rootDir, 'screenshots');
const dateStamp = new Date().toISOString().slice(0, 10);
const PORT = 4321;
const BASE = '/shahf11-blog';
const origin = `http://127.0.0.1:${PORT}`;

if (!existsSync(distDir)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const viewports = [
  { name: 'desktop', width: 1440, height: 1100 },
  { name: 'mobile', width: 390, height: 1200 },
];

// A post that ships an image makes the best visual smoke; fall back to any post.
const postDirs = existsSync(path.join(distDir, 'posts'))
  ? readdirSync(path.join(distDir, 'posts'), { withFileTypes: true }).filter((d) => d.isDirectory())
  : [];
const samplePost = postDirs.find((d) => /\d/.test(d.name))?.name ?? postDirs[0]?.name;

const routes = [
  { name: 'home', path: `${BASE}/` },
  ...(existsSync(path.join(distDir, 'about')) ? [{ name: 'about', path: `${BASE}/about` }] : []),
  ...(samplePost ? [{ name: `post-${samplePost}`, path: `${BASE}/posts/${samplePost}` }] : []),
];

const ping = (url) =>
  new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });

async function waitFor(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await ping(url)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const server = spawn('npx', ['astro', 'preview', '--host', '127.0.0.1', '--port', String(PORT)], {
  cwd: rootDir,
  stdio: ['ignore', 'inherit', 'inherit'],
});

let failed = null;
try {
  await waitFor(`${origin}${BASE}/`, 20000);
  mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const route of routes) {
      for (const vp of viewports) {
        const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
        const res = await page.goto(`${origin}${route.path}`, { waitUntil: 'networkidle' });
        if (!res || !res.ok()) throw new Error(`${route.path} -> ${res ? res.status() : 'no response'}`);
        await page.screenshot({
          path: path.join(screenshotDir, `${route.name}-${vp.name}-${dateStamp}.png`),
          fullPage: true,
        });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`Captured ${routes.length * viewports.length} screenshots in screenshots/.`);
} catch (err) {
  failed = err;
} finally {
  server.kill('SIGTERM');
}

if (failed) {
  console.error(failed.stack ?? String(failed));
  process.exit(1);
}
