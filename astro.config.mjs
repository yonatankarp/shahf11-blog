import { defineConfig } from 'astro/config';
import { rewriteImageBase } from './src/lib/rehype-image-base.mjs';

export default defineConfig({
  site: 'https://yonatankarp.github.io',
  base: '/shahf11-blog',
  trailingSlash: 'ignore',
  markdown: { rehypePlugins: [rewriteImageBase] },
});
