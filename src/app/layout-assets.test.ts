import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * `layout.tsx` names static assets — favicons, the Open Graph card — by URL
 * path. Nothing type-checks that a path under `/` has a file under `public/`,
 * so a rename or a never-committed asset becomes a 404 on every page load
 * (the favicon) or a broken image on every social unfurl (the OG card), and
 * no gate in the repo notices.
 *
 * The layout module itself cannot be imported here (it pulls next/font and a
 * global stylesheet through Next's loaders), so this reads the source and
 * resolves every root-relative asset literal against `public/`. Comments are
 * stripped first so a path mentioned in prose cannot satisfy the check.
 *
 * Negative control (recorded 2026-09-05, before the fix): `/favicon.ico`,
 * `/favicon-16x16.png`, `/apple-touch-icon.png` and `/og-default.png` were
 * referenced and none existed under public/ — 4 missing, test red.
 */

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, '..', '..');
const publicDir = path.join(repoRoot, 'public');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function assetLiterals(source: string): string[] {
  const out = new Set<string>();
  // '/x.png' | "/x.ico" | `${baseUrl}/x.png`
  const matches = Array.from(
    source.matchAll(/(?:['"]|\$\{baseUrl\})(\/[A-Za-z0-9_./-]+\.(?:png|ico|svg|jpe?g|webp|gif))['"`]/g),
  );
  for (const m of matches) out.add(m[1]);
  return Array.from(out).sort();
}

function pngSize(file: string): { width: number; height: number } {
  const b = readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

describe('layout.tsx static asset references', () => {
  const source = stripComments(readFileSync(path.join(appDir, 'layout.tsx'), 'utf8'));
  const assets = assetLiterals(source);

  it('still declares an icon and an Open Graph image (the population is not empty)', () => {
    expect(assets.length).toBeGreaterThanOrEqual(1);
    expect(source).toMatch(/icons:\s*\{/);
    expect(source).toMatch(/openGraph:[\s\S]*images:\s*\[/);
  });

  it('every referenced asset exists under public/', () => {
    const missing = assets.filter((a) => !existsSync(path.join(publicDir, a)));
    expect(missing, `missing under public/: ${missing.join(', ')}`).toEqual([]);
  });

  it('the Open Graph image declares its real pixel dimensions', () => {
    const m = source.match(/url: `\$\{baseUrl\}(\/[^`]+\.png)`,\s*width: (\d+),\s*height: (\d+)/);
    expect(m, 'openGraph.images[0] must carry url/width/height').not.toBeNull();
    const [, file, w, h] = m!;
    const real = pngSize(path.join(publicDir, file));
    expect({ width: Number(w), height: Number(h) }).toEqual(real);
  });
});
