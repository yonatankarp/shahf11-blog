import { visit } from 'unist-util-visit';
import fs from 'node:fs';
import path from 'node:path';

// Rewrites inline markdown images (../images/X or images/X) to <base>/images/X,
// and decorates every local images/ <img> with lazy loading + intrinsic dimensions
// (from public/images-dimensions.json, written by scripts/copy-images.mjs).
const BASE = '/shahf11-blog';

let dims;
function dimensionsFor(file) {
  if (!dims) {
    try {
      dims = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'images-dimensions.json'), 'utf8'));
    } catch {
      dims = {};
    }
  }
  return dims[file];
}

export function rewriteImageBase() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img' || !node.properties?.src) return;
      const src = String(node.properties.src);
      if (/^(https?:)?\/\//.test(src)) return; // leave external URLs alone
      let file;
      if (src.startsWith(`${BASE}/images/`)) {
        file = src.slice(`${BASE}/images/`.length);
      } else {
        const m = src.match(/(?:\.\.\/)?images\/(.+)$/);
        if (!m) return;
        file = m[1];
        node.properties.src = `${BASE}/images/${file}`;
      }
      node.properties.loading ??= 'lazy';
      node.properties.decoding ??= 'async';
      const d = dimensionsFor(file);
      if (d) {
        node.properties.width ??= d.width;
        node.properties.height ??= d.height;
      }
    });
  };
}
