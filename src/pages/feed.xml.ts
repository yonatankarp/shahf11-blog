import type { APIRoute } from 'astro';
import { getAllPosts, excerpt } from '../lib/posts';
import { withBase } from '../lib/url';

const FEED_TITLE = 'חיה בסרט(ן)';
const FEED_DESCRIPTION = "ארכיון הבלוג 'חיה בסרט(ן)' מאת חיה, 2008-2009.";

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  }[char] ?? char));
}

function absoluteUrl(site: URL, path: string): string {
  return new URL(withBase(path), site).href;
}

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site ?? new URL('https://hayabesartan.com');
  const posts = (await getAllPosts()).toReversed();
  const feedUrl = absoluteUrl(siteUrl, 'feed.xml');
  const homeUrl = absoluteUrl(siteUrl, '');
  const latestDate = posts[0]?.data.date ?? new Date(0);
  const items = posts.map((post) => {
    const postUrl = absoluteUrl(siteUrl, `posts/${post.data.entryId}`);
    return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${post.data.date.toUTCString()}</pubDate>
      <description>${escapeXml(excerpt(post.body ?? ''))}</description>
    </item>`;
  }).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${homeUrl}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>he</language>
    <lastBuildDate>${latestDate.toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  });
};
