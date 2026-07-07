import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { rewriteImageBase } from './src/lib/rehype-image-base.mjs';
import { dropTitleH1 } from './src/lib/rehype-drop-title.mjs';

export default defineConfig({
  site: 'https://hayabesartan.com',
  base: '/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  // Astro 7 defaults to the Sätteri processor; opt into the unified processor
  // explicitly so our rehype plugin runs (replaces the deprecated markdown.rehypePlugins).
  markdown: { processor: unified({ rehypePlugins: [rewriteImageBase, dropTitleH1] }) },
});
