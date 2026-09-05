import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '@tailwindcss/node';
import { describe, expect, it } from 'vitest';

/**
 * The `@theme` block in globals.css is a CONTRACT with Tailwind v4: a key is
 * only a utility if it sits in a namespace v4 knows (`--font-*`, `--text-*`,
 * `--color-*`, ...). A key in a v3-shaped namespace (`--font-family-*`,
 * `--font-size-*`) is silently ignored — the class compiles to nothing and
 * every call site renders as if the class were absent. Nothing else in the
 * repo can see that: eslint does not read CSS, tsc does not read class
 * strings, and the browser has no "unknown class" error.
 *
 * So this test asks Tailwind itself. It compiles globals.css with the real
 * engine and a fixed candidate list (no filesystem scan, ~100 ms) and asserts
 * that the theme-declared families actually reach a utility.
 *
 * Negative control (recorded 2026-09-05, before the fix): with the theme keys
 * spelled `--font-family-grotesk|sans|mono`, `.font-grotesk` was ABSENT from
 * the output and `--font-sans` / `--font-mono` carried Tailwind's default
 * stacks — 3 of 3 assertions red. 29 `font-grotesk` call sites and 60
 * `font-mono` call sites were no-ops in production.
 */

const appDir = path.dirname(fileURLToPath(import.meta.url));

async function buildGlobals(candidates: string[]): Promise<string> {
  const css = readFileSync(path.join(appDir, 'globals.css'), 'utf8');
  const compiler = await compile(css, {
    base: appDir,
    onDependency: () => {},
  });
  return compiler.build(candidates);
}

function ruleFor(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const end = css.indexOf('}', start);
  return css.slice(start, end + 1).replace(/\s+/g, ' ');
}

function themeVar(css: string, name: string): string | null {
  const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

describe('globals.css @theme — font families reach their utilities', () => {
  it('emits .font-grotesk bound to the self-hosted Space Grotesk with a named fallback', async () => {
    const out = await buildGlobals(['font-grotesk']);
    const rule = ruleFor(out, '.font-grotesk');
    expect(rule, '.font-grotesk must compile to a rule').not.toBeNull();
    // next/font exposes the family through --font-space-grotesk on <body>;
    // the theme inlines it so the utility resolves at the element, with the
    // web-font name as the fallback for surfaces outside <body> scope.
    expect(rule).toContain('var(--font-space-grotesk)');
    expect(rule).toContain('Space Grotesk');
  });

  it('binds --font-sans to Inter (the family the app loads) rather than the default stack', async () => {
    const out = await buildGlobals(['font-sans']);
    expect(ruleFor(out, '.font-sans')).not.toBeNull();
    expect(themeVar(out, '--font-sans')).toContain('Inter');
  });

  it('binds --font-mono to JetBrains Mono (the family the app loads) rather than the default stack', async () => {
    const out = await buildGlobals(['font-mono']);
    expect(ruleFor(out, '.font-mono')).not.toBeNull();
    expect(themeVar(out, '--font-mono')).toContain('JetBrains Mono');
  });
});
