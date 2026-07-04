import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;

export async function getAllPosts(): Promise<PostEntry[]> {
  const posts = await getCollection('posts');
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getAdjacent(entryId: string) {
  const posts = await getAllPosts(); // newest-first
  const i = posts.findIndex((p) => p.data.entryId === entryId);
  return {
    newer: i > 0 ? posts[i - 1] : null,
    older: i >= 0 && i < posts.length - 1 ? posts[i + 1] : null,
  };
}

export function excerpt(body: string, words = 30): string {
  const text = body
    .replace(/^\s*#[^\n]*\n+/, '') // drop the leading "# <title>" heading each post opens with
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/[#>*_`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = text.split(' ');
  return parts.length <= words ? text : parts.slice(0, words).join(' ') + '…';
}
