/** A list's public address. Matches the CHECK on goat_v2.lists.slug. */
const SLUG_PATTERN = /^[a-z0-9-]{3,80}$/;

const MAX_BASE = 60;

/** A readable slug from a title: lowercase ASCII words joined by dashes. */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BASE)
    .replace(/-+$/g, '');
  return base.length >= 3 ? base : base ? `${base}-list`.slice(0, MAX_BASE) : 'list';
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** A short random tail, for when the readable slug is taken. */
export function randomSuffix(random: () => number = Math.random, length = 5): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return out;
}

/** Attempt 0 is the plain slug; later attempts add a random tail. */
export function slugAttempt(base: string, attempt: number, random: () => number = Math.random): string {
  return attempt === 0 ? base : `${base}-${randomSuffix(random)}`.slice(-80);
}

export function isSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}
