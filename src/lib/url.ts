// Join the site base path with a route, tolerant of whether BASE_URL has a trailing slash.
const base = import.meta.env.BASE_URL;
export const withBase = (path: string): string =>
  `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
