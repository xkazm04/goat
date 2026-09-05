/**
 * Tests for the generated embed snippets: a list id is DATA, never markup.
 *
 * Registry: public-verdict-badge/embed-snippet-contract (the copied snippet is
 * a contract the embedder pastes into a page they own); security/output
 * escaping.
 *
 * The iframe snippet was already safe — its only interpolation is a URL built
 * by URLSearchParams. The script, shortcode and markdown snippets, and
 * `generateFullUrl`, interpolated `listId` raw into an HTML id attribute, a JS
 * string literal, a shortcode attribute and a path segment. Ids are UUIDs
 * today, so this is a guard on a door that is currently only walked by
 * well-formed callers — which is exactly when the guard is cheap.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests), run 2026-09-05
 * against the pre-fix generators: reds 4 of these 5 tests (measured); the
 * iframe test was green before and after, as it should be.
 */

import { describe, expect, it } from 'vitest';

import {
  generateFullUrl,
  generateIframeEmbed,
  generateMarkdownEmbed,
  generateScriptEmbed,
  generateWordPressShortcode,
} from './EmbedCodeGenerator';
import { normalizeWidgetConfig } from './types';

const hostile = `x" onload="alert(1)' </script><b>)`;
const config = normalizeWidgetConfig({ listId: hostile });

describe('embed snippets — listId cannot break out of its slot', () => {
  it('generateFullUrl encodes the id as a path segment', () => {
    const url = generateFullUrl('a b/c?d');
    expect(url.endsWith('/share/a%20b%2Fc%3Fd')).toBe(true);
  });

  it('the iframe snippet carries the id only inside an encoded URL', () => {
    const html = generateIframeEmbed(config);
    expect(html).not.toContain(hostile);
    expect(html).not.toContain('</script>');
  });

  it('the script snippet keeps the id out of the attribute and the JS string', () => {
    const html = generateScriptEmbed(config);
    expect(html).not.toContain(hostile);
    expect(html).not.toContain('</script><b>');
    // Every id attribute value is a safe token.
    const ids = Array.from(html.matchAll(/id="([^"]*)"/g), (m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    // Every getElementById argument is the same safe token.
    const lookups = Array.from(html.matchAll(/getElementById\('([^']*)'\)/g), (m) => m[1]);
    expect(lookups).toEqual(ids);
  });

  it('the WordPress shortcode escapes the quote that would end its attribute', () => {
    const code = generateWordPressShortcode(config);
    expect(code).not.toContain(hostile);
    expect(code.match(/"/g)?.length).toBe(8); // four attributes, two quotes each
  });

  it('the markdown snippet encodes the id inside both URLs', () => {
    const md = generateMarkdownEmbed(config);
    expect(md).not.toContain(hostile);
    // `[![alt](img)](href)` — exactly two URL groups survive; the id's own
    // parenthesis and quote are percent-encoded rather than closing a group.
    expect((md.match(/\(/g) ?? []).length).toBe(2);
    expect((md.match(/\)/g) ?? []).length).toBe(2);
    for (const url of Array.from(md.matchAll(/\(([^)]*)\)/g), (m) => m[1])) expect(url).not.toMatch(/[\s"'<>]/);
  });
});
