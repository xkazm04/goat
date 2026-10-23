import { isSlug } from './slug';

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 480;
const MIN_SIZE = 200;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1000;

/** `/p/<slug>` on this site (or a path like it) to the slug, or null for anything else. */
export function slugFromUrl(raw: string, origin: string): string | null {
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return null;
  }
  if (url.origin !== new URL(origin).origin) return null;
  const match = /^\/p\/([^/]+)\/?$/.exec(url.pathname);
  return match && isSlug(match[1]) ? match[1] : null;
}

/** The iframe snippet a list's owner pastes into another page. */
export function embedCode(origin: string, slug: string, mode: 'mosaic' | 'spread'): string {
  const src = `${origin}/embed/${slug}${mode === 'spread' ? '?mode=spread' : ''}`;
  return `<iframe src="${escapeAttr(src)}" width="${DEFAULT_WIDTH}" height="${DEFAULT_HEIGHT}" style="border:0;max-width:100%" loading="lazy" title="G.O.A.T. ranking"></iframe>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function size(raw: string | null, fallback: number, max: number): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(MIN_SIZE, n)) : fallback;
}

export interface OEmbed {
  version: '1.0';
  type: 'rich';
  provider_name: string;
  provider_url: string;
  title: string;
  width: number;
  height: number;
  html: string;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
}

/** The oEmbed 1.0 "rich" response for a published list. */
export function buildOEmbed(input: {
  origin: string;
  slug: string;
  title: string;
  maxWidth?: string | null;
  maxHeight?: string | null;
}): OEmbed {
  const width = size(input.maxWidth ?? null, DEFAULT_WIDTH, MAX_WIDTH);
  const height = size(input.maxHeight ?? null, DEFAULT_HEIGHT, MAX_HEIGHT);
  const src = `${input.origin}/embed/${input.slug}`;
  const html = `<iframe src="${escapeAttr(src)}" width="${width}" height="${height}" style="border:0;max-width:100%" loading="lazy" title="${escapeAttr(input.title)}"></iframe>`;
  return {
    version: '1.0',
    type: 'rich',
    provider_name: 'G.O.A.T.',
    provider_url: input.origin,
    title: input.title,
    width,
    height,
    html,
    thumbnail_url: `${input.origin}/p/${input.slug}/opengraph-image`,
    thumbnail_width: 1200,
    thumbnail_height: 630,
  };
}
