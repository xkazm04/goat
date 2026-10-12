/**
 * Centralized share URL construction.
 *
 * Every part of the app that needs to build a `/share/…` or `/api/og/…` URL
 * should import helpers from this module so the format is defined once.
 */

// ---------------------------------------------------------------------------
// Base URL resolution
// ---------------------------------------------------------------------------

const DEFAULT_APP_URL = 'https://goat.app';

/**
 * Resolve the application base URL.
 *
 * - Server-side: uses NEXT_PUBLIC_APP_URL (falls back to DEFAULT_APP_URL).
 * - Client-side: prefers window.location.origin so links always match the
 *   current domain (useful for preview / staging deploys).
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
}

/**
 * Server-only base URL (never reads window).
 * Use this in API routes, server components, and metadata generators.
 */
export function getServerBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
}

// ---------------------------------------------------------------------------
// Share URLs
// ---------------------------------------------------------------------------

/** Canonical share page URL for a ranking. */
export function getShareUrl(code: string, baseUrl?: string): string {
  return `${baseUrl ?? getBaseUrl()}/share/${code}`;
}

/** Challenge redirect URL. */
export function getChallengeUrl(code: string, baseUrl?: string): string {
  return `${baseUrl ?? getBaseUrl()}/?challenge=${code}`;
}

// ---------------------------------------------------------------------------
// OG Image URLs
// ---------------------------------------------------------------------------

export interface OGImageOptions {
  layout?: string;
  platform?: 'twitter' | 'facebook';
}

/** OG image URL for a share code. */
export function getOGImageUrl(
  code: string,
  options: OGImageOptions = {},
  baseUrl?: string,
): string {
  const base = baseUrl ?? getServerBaseUrl();
  const params = new URLSearchParams();
  if (options.layout) params.set('layout', options.layout);
  if (options.platform) params.set('platform', options.platform);
  const qs = params.toString();
  return `${base}/api/og/${code}${qs ? `?${qs}` : ''}`;
}

// ---------------------------------------------------------------------------
// Blueprint / Template URLs
// ---------------------------------------------------------------------------

/** Blueprint share page URL. */
export function getBlueprintUrl(slug: string, baseUrl?: string): string {
  return `${baseUrl ?? getBaseUrl()}/blueprint/${slug}`;
}

/** Template gallery URL filtered to a specific blueprint. */
export function getTemplateViewUrl(slug: string, baseUrl?: string): string {
  return `${baseUrl ?? getBaseUrl()}/templates?view=${slug}`;
}

// ---------------------------------------------------------------------------
// Tier List URLs
// ---------------------------------------------------------------------------

/** Shareable tier-list URL with encoded placement data. */
export function getTierListShareUrl(listId: string, encodedData: string, baseUrl?: string): string {
  return `${baseUrl ?? getBaseUrl()}/share/tierlist/${listId}?data=${encodedData}`;
}

// ---------------------------------------------------------------------------
// Achievement URLs
// ---------------------------------------------------------------------------

/** Achievement share page URL. */
export function getAchievementUrl(code: string, baseUrl?: string): string {
  return `${baseUrl ?? getBaseUrl()}/achievement/${code}`;
}

/** Achievement OG image URL. */
export function getAchievementOGUrl(code: string, baseUrl?: string): string {
  return `${baseUrl ?? getServerBaseUrl()}/api/achievement/og?code=${code}`;
}

/** Achievement embed iframe snippet. */
export function getAchievementEmbedCode(code: string, baseUrl?: string): string {
  const url = getAchievementUrl(code, baseUrl);
  return `<iframe src="${url}/embed" width="400" height="300" frameborder="0" title="G.O.A.T. Achievement"></iframe>`;
}

// ---------------------------------------------------------------------------
// Social platform share URLs
// ---------------------------------------------------------------------------

export type SocialSharePlatform =
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'reddit'
  | 'whatsapp'
  | 'discord';

interface SocialShareOptions {
  platform: SocialSharePlatform;
  url: string;
  text: string;
  hashtags?: string;
}

/**
 * Build a social-platform share URL.
 *
 * Returns `null` for platforms that don't open a URL (e.g. Discord, which
 * copies to clipboard instead). Callers should handle `null` by falling back
 * to clipboard copy.
 */
export function buildSocialShareUrl(options: SocialShareOptions): string | null {
  const { platform, url, text, hashtags } = options;

  switch (platform) {
    case 'twitter': {
      const params = new URLSearchParams({ text, url });
      if (hashtags) params.set('hashtags', hashtags);
      return `https://twitter.com/intent/tweet?${params.toString()}`;
    }
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    case 'reddit':
      return `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`;
    case 'discord':
      return null;
    default:
      return null;
  }
}
