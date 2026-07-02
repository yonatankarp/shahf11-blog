import { getAllPosts, type PostEntry } from './posts';
import { TAGS, type TagDef } from '../data/tags';

const byId = new Map(TAGS.map((t) => [t.id, t]));

// Resolve a tag id to its definition. Unknown ids (e.g. a stray frontmatter value) fall
// back to a plain topic labelled with the id itself, so the build never breaks on a typo.
export function getTag(id: string): TagDef {
  return byId.get(id) ?? { id, label: id, kind: 'topic' };
}

export function tagsForPost(post: PostEntry): TagDef[] {
  return (post.data.tags ?? []).map(getTag);
}

export async function postsForTag(id: string): Promise<PostEntry[]> {
  const posts = await getAllPosts(); // newest-first
  return posts.filter((p) => (p.data.tags ?? []).includes(id));
}

export interface TagWithPosts extends TagDef {
  posts: PostEntry[];
  count: number;
}

// Every tag that appears on at least one post, in registry order (people before topics),
// each carrying its posts (newest-first). Unused registry tags are omitted.
export async function allTagsWithCounts(): Promise<TagWithPosts[]> {
  const posts = await getAllPosts();
  const groups = new Map<string, PostEntry[]>();
  for (const p of posts) {
    for (const id of p.data.tags ?? []) {
      const arr = groups.get(id);
      if (arr) arr.push(p);
      else groups.set(id, [p]);
    }
  }
  const seen = new Set<string>();
  const result: TagWithPosts[] = [];
  for (const t of TAGS) {
    const ps = groups.get(t.id);
    if (!ps?.length) continue;
    result.push({ ...t, posts: ps, count: ps.length });
    seen.add(t.id);
  }
  for (const [id, ps] of groups) {
    if (seen.has(id)) continue;
    result.push({ ...getTag(id), posts: ps, count: ps.length });
  }
  return result;
}

// Exact-match lookup by label or alias — handy for programmatic resolution.
export function findTag(query: string): TagDef | undefined {
  const q = query.trim().toLowerCase();
  return TAGS.find(
    (t) => t.label.toLowerCase() === q || (t.aliases ?? []).some((a) => a.toLowerCase() === q),
  );
}
