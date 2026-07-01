import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { rewriteImageBase } from './src/lib/rehype-image-base.mjs';

export default defineConfig({
  site: 'https://yonatankarp.com',
  base: '/shahf11-blog',
  trailingSlash: 'ignore',
  // Astro 7 defaults to the Sätteri processor; opt into the unified processor
  // explicitly so our rehype plugin runs (replaces the deprecated markdown.rehypePlugins).
  markdown: { processor: unified({ rehypePlugins: [rewriteImageBase] }) },
});
