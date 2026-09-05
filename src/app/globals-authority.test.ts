import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import postcss, { type AtRule, type Container, type Node, type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

/**
 * globals.css is 1800 lines that grew by appending sections. Two sections
 * can define the same name, and CSS resolves that silently: the later
 * `animation` wins, the earlier `@keyframes` is shadowed, and every consumer
 * of the class gets whichever author appended last. No tool in the repo reads
 * CSS for this — eslint and tsc do not, Tailwind compiles both without a
 * word — so this test is the one instrument that can see it.
 *
 * What counts as a conflict is deliberately narrow, because CSS re-declares
 * legitimately all the time: a `.dark` rebinding block, a reduced-motion
 * `animation: none` override inside `@media`, a `[data-motion-tier]` scope.
 * A conflict here is ONE class name whose `animation` shorthand is declared
 * more than once with NO enclosing @media / @supports / attribute scope —
 * i.e. two unconditional authors for one animation — or one `@keyframes`
 * name defined twice.
 *
 * Negative control (recorded 2026-09-05, before the fix):
 *   .animate-ambient-shimmer  @utility (background-position, 1s linear) and a
 *                             plain rule in the showcase block (translateX, 2s)
 *   @keyframes ambient-shimmer  defined in @theme inline AND in @layer utilities
 * — 2 conflicts, test red. Three consumers were getting the translateX sweep
 * that one of them (CollectionsSection, with backgroundSize 200%) was not
 * written for.
 */

const appDir = path.dirname(fileURLToPath(import.meta.url));

function parse(file: string) {
  return postcss.parse(readFileSync(path.join(appDir, file), 'utf8'));
}

function isConditional(node: Node): boolean {
  let p: Container | undefined = node.parent as Container | undefined;
  while (p) {
    if (p.type === 'atrule') {
      const name = (p as AtRule).name;
      if (name === 'media' || name === 'supports' || name === 'keyframes') return true;
    }
    if (p.type === 'rule' && /\[data-|^\.dark|^\.experimental|^\[/.test((p as Rule).selector)) return true;
    p = p.parent as Container | undefined;
  }
  return false;
}

function simpleClass(selector: string): string | null {
  const m = selector.trim().match(/^\.([A-Za-z0-9_-]+)$/);
  return m ? m[1] : null;
}

describe('globals.css — one unconditional author per animation and per keyframes name', () => {
  const root = parse('globals.css');

  it('no class declares `animation` unconditionally in more than one place', () => {
    const authors = new Map<string, string[]>();
    const record = (cls: string, where: string) => {
      const list = authors.get(cls) ?? [];
      list.push(where);
      authors.set(cls, list);
    };

    root.walkAtRules('utility', (at) => {
      at.walkDecls('animation', (d) => {
        if (d.parent === at) record(at.params.trim(), `@utility line ${at.source?.start?.line}`);
      });
    });
    root.walkRules((rule) => {
      const cls = simpleClass(rule.selector);
      if (!cls || isConditional(rule)) return;
      rule.walkDecls('animation', (d) => {
        if (d.parent === rule) record(cls, `rule line ${rule.source?.start?.line}`);
      });
    });

    const conflicts = Array.from(authors.entries())
      .filter(([, where]) => where.length > 1)
      .map(([cls, where]) => `${cls}: ${where.join(' | ')}`);
    expect(conflicts).toEqual([]);
  });

  it('no @keyframes name is defined twice', () => {
    const seen = new Map<string, number>();
    root.walkAtRules('keyframes', (at) => {
      const name = at.params.trim();
      seen.set(name, (seen.get(name) ?? 0) + 1);
    });
    const dupes = Array.from(seen.entries())
      .filter(([, n]) => n > 1)
      .map(([name, n]) => `${name} x${n}`);
    expect(dupes).toEqual([]);
  });
});
