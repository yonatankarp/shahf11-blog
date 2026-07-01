import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  // generateId preserves the original filename casing (default slugifies to lowercase),
  // so post.id === the on-disk stem (e.g. 001_EID1214120) and matches the PDF filename.
  loader: glob({ pattern: '*.md', base: './content', generateId: ({ entry }) => entry.replace(/\.md$/, '') }),
  schema: z.object({
    entryId: z.string(),
    title: z.string(),
    title_source: z.string().optional(),
    date: z.coerce.date(),
    date_published: z.string(),
    category: z.string(),
    date_stamp: z.string().default(''),
    source_url: z.string(),
    source_scan: z.string().default(''),
    pages: z.number(),
    lang: z.literal('he'),
    images: z.array(z.string()).default([]),
    review: z.array(z.string()).default([]),
    note: z.string().default(''),
    tags: z.array(z.string()).default([]), // forward-compat: unused now
  }),
});

export const collections = { posts };
