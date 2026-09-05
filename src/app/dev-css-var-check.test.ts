// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import postcss from 'postcss';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REQUIRED_CSS_VARS, checkCssVariableContract } from './dev-css-var-check';

/**
 * dev-css-var-check exists to warn, in development, when a design token the
 * components depend on is missing from :root. Two ways it can fail silently:
 *
 *  1. It never runs where it can see the target. It used to be invoked from
 *     the top of layout.tsx — a SERVER component module, which the browser
 *     never executes — so the only place it ran was the server, where its
 *     first line (`typeof window === 'undefined'`) returned. A gate that cannot
 *     see its target reports a clean codebase in the voice of success.
 *  2. Its list drifts from the contract. It named 7 of the 30 tokens in
 *     design-tokens.css, so 23 tokens could vanish without a warning.
 *
 * The first is fixed structurally (a 'use client' component rendered by the
 * layout) and pinned by the source assertions below; the second by deriving
 * the expected list from design-tokens.css itself here, so the list cannot
 * fall behind the file it guards.
 *
 * Negative control (recorded 2026-09-05, before the fix): the module exported
 * neither REQUIRED_CSS_VARS nor a returning check, so this file failed to
 * import; with the exports added but the old 7-entry list, the derivation
 * case reported 23 tokens absent from the list.
 */

const appDir = path.dirname(fileURLToPath(import.meta.url));

function contractTokens(): string[] {
  const root = postcss.parse(readFileSync(path.join(appDir, 'design-tokens.css'), 'utf8'));
  const out = new Set<string>();
  root.walkRules(':root', (rule) => {
    rule.walkDecls((d) => {
      if (d.prop.startsWith('--')) out.add(d.prop);
    });
  });
  return Array.from(out).sort();
}

describe('dev-css-var-check', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('style');
    vi.restoreAllMocks();
  });

  it('REQUIRED_CSS_VARS is exactly the set of tokens declared on :root in design-tokens.css', () => {
    expect(Array.from(REQUIRED_CSS_VARS).sort()).toEqual(contractTokens());
  });

  it('returns the missing tokens and warns once when any is absent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = document.documentElement;
    for (const v of REQUIRED_CSS_VARS) root.style.setProperty(v, '1px');
    expect(checkCssVariableContract(root)).toEqual([]);
    expect(warn).not.toHaveBeenCalled();

    root.style.removeProperty('--surface-card');
    expect(checkCssVariableContract(root)).toEqual(['--surface-card']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0].join(' '))).toContain('--surface-card');
  });

  it('is a client module that the root layout renders (so it can see a browser)', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    const checkSource = strip(readFileSync(path.join(appDir, 'dev-css-var-check.ts'), 'utf8'));
    const layout = strip(readFileSync(path.join(appDir, 'layout.tsx'), 'utf8'));
    expect(checkSource.trimStart().startsWith("'use client'")).toBe(true);
    expect(layout).toMatch(/<DevCssVarCheck\s*\/>/);
    // The old shape: a dynamic import at module scope of a server component.
    expect(layout).not.toMatch(/import\(['"]\.\/dev-css-var-check['"]\)/);
  });
});
