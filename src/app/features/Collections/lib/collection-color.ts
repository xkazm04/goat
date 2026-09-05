/**
 * A collection's accent colour, as the ONE value this feature will paint with.
 *
 * `ListCollection.color` is stored verbatim from the request body
 * (`/api/collections` POST and `[id]` PUT apply no format check), and every
 * surface in this feature interpolates it into an inline `background:` /
 * `boxShadow:` — often with two hex digits appended for alpha (`${color}20`).
 * That assumes a 6-digit hex and it trusts the string: a value such as
 * `red), url(https://evil.example/px` reaches the PUBLIC share page's style
 * attribute, where `url()` fetches a beacon for every viewer, and a named or
 * 3-digit colour silently breaks the gradient instead.
 *
 * One door: anything that is not `#rgb` / `#rrggbb` becomes the default, and
 * `#rgb` is widened so the alpha-append sites keep working.
 */
export const DEFAULT_COLLECTION_COLOR = "#06b6d4";

const HEX6 = /^#([0-9a-f]{6})$/i;
const HEX3 = /^#([0-9a-f]{3})$/i;

export function safeCollectionColor(
  color: string | null | undefined,
  fallback: string = DEFAULT_COLLECTION_COLOR
): string {
  if (typeof color !== "string") return fallback;
  const value = color.trim();
  if (HEX6.test(value)) return value.toLowerCase();
  const short = value.match(HEX3);
  if (short) {
    const [r, g, b] = short[1].toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}
