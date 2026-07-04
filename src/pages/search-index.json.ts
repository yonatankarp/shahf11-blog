import type { APIRoute } from 'astro';
import { getAllPosts, excerpt } from '../lib/posts';
import { tagsForPost } from '../lib/tags';
import { withBase } from '../lib/url';

// Prebuilt client-side search index: one entry per post. `text` is the lowercased haystack
// (title + body + tag labels/aliases) so the on-page search matches any word in the blog,
// not just tag names. Served static at <base>/search-index.json.
export const GET: APIRoute = async () => {
  const posts = await getAllPosts();
  const data = posts.map((p) => {
    // Person nicknames/roles help ("בעלי" → posts about חיים צור). Topic aliases (פריז,
    // כימותרפיה…) would spray onto every topic post, so include only topic *labels*.
    const tagText = tagsForPost(p)
      .flatMap((t) => (t.kind === 'person' ? [t.label, ...(t.aliases ?? [])] : [t.label]))
      .join(' ');
    const body = (p.body ?? '')
      .replace(/^\s*#[^\n]*\n+/, '') // leading "# title"
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
      .replace(/[#>*_`\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      title: p.data.title,
      date: p.data.date_published,
      url: withBase(`posts/${p.data.entryId}`),
      excerpt: excerpt(p.body ?? ''),
      text: `${p.data.title} ${body} ${tagText}`.toLowerCase(),
    };
  });
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
