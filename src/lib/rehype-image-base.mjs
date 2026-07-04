import { visit } from 'unist-util-visit';

// Rewrites inline markdown images (../images/X or images/X) to <base>/images/X.
const BASE = '/shahf11-blog';

export function rewriteImageBase() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img' || !node.properties?.src) return;
      const src = String(node.properties.src);
      if (/^(https?:)?\/\//.test(src) || src.startsWith(BASE)) return; // leave absolute/already-based URLs
      const m = src.match(/(?:\.\.\/)?images\/(.+)$/);
      if (m) node.properties.src = `${BASE}/images/${m[1]}`;
    });
  };
}
