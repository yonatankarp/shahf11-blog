import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;

export async function getAllPosts(): Promise<PostEntry[]> {
  const posts = await getCollection('posts');
  // Oldest-first — the blog is complete, so it reads front-to-back like a book.
  return posts.sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
}

export async function getAdjacent(entryId: string) {
  const posts = await getAllPosts(); // oldest-first
  const i = posts.findIndex((p) => p.data.entryId === entryId);
  return {
    older: i > 0 ? posts[i - 1] : null,
    newer: i >= 0 && i < posts.length - 1 ? posts[i + 1] : null,
  };
}

export function plainText(body: string): string {
  return body
    .replace(/^\s*#[^\n]*\n+/, '') // drop the leading "# <title>" heading each post opens with
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links: keep the text, drop the (url)
    .replace(/[#>*_`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(body: string, words = 30): string {
  const text = plainText(body);
  const parts = text.split(' ');
  return parts.length <= words ? text : parts.slice(0, words).join(' ') + '…';
}

export function publishedDateTime(post: PostEntry): string {
  const dateIso = post.data.date.toISOString().slice(0, 10);
  const time = post.data.date_published.match(/(\d{1,2}):(\d{2})\s*$/);
  if (!time) return dateIso;
  return `${dateIso}T${time[1].padStart(2, '0')}:${time[2]}`;
}
