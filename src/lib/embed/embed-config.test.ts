/**
 * Tests for the widget-config vocabulary: one normalizer, closed lists.
 *
 * Registry: public-verdict-badge/embed-snippet-contract (the snippet pins a
 * config the server can always render); _laws one-validation-door.
 *
 * Before 2026-09-05 `parseEmbedUrl` cast `params.get('size') as WidgetSize`, so
 * a URL with `size=huge` produced a config whose `WIDGET_DIMENSIONS[size]` was
 * undefined and every embed generator threw `Cannot read properties of
 * undefined (reading 'width')`; `count=abc` produced `itemCount: NaN`. The
 * embed API route has its own copy of the parser with the same cast.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests), run 2026-09-05
 * against the tree BEFORE `normalizeWidgetConfig` was wired into
 * `parseEmbedUrl` and the `EmbedCodeGenerator` constructor: reds 5 of these
 * 11 tests (measured) — the five that exercise a parser or the constructor.
 */

import { describe, expect, it } from 'vitest';

import {
  EmbedCodeGenerator,
  generateIframeEmbed,
  generateWidgetUrl,
  parseEmbedUrl,
} from './EmbedCodeGenerator';
import {
  DEFAULT_WIDGET_CONFIG,
  WIDGET_DIMENSIONS,
  WIDGET_DISPLAY_STYLES,
  WIDGET_ITEM_COUNT,
  WIDGET_SIZES,
  WIDGET_THEMES,
  normalizeWidgetConfig,
} from './types';

const url = (qs: string) => `https://example.test/api/embed?id=list-1&${qs}`;

describe('normalizeWidgetConfig — every field lands inside its vocabulary', () => {
  it('replaces an unknown size / theme / display with the defaults', () => {
    const c = normalizeWidgetConfig({
      listId: 'x',
      size: 'huge' as never,
      theme: 'neon' as never,
      displayStyle: 'carousel' as never,
    });
    expect(c.size).toBe(DEFAULT_WIDGET_CONFIG.size);
    expect(c.theme).toBe(DEFAULT_WIDGET_CONFIG.theme);
    expect(c.displayStyle).toBe(DEFAULT_WIDGET_CONFIG.displayStyle);
  });

  it('keeps every member of every vocabulary', () => {
    for (const size of WIDGET_SIZES) expect(normalizeWidgetConfig({ listId: 'x', size }).size).toBe(size);
    for (const displayStyle of WIDGET_DISPLAY_STYLES)
      expect(normalizeWidgetConfig({ listId: 'x', displayStyle }).displayStyle).toBe(displayStyle);
    for (const theme of WIDGET_THEMES.filter((t) => t !== 'custom'))
      expect(normalizeWidgetConfig({ listId: 'x', theme }).theme).toBe(theme);
  });

  it('clamps itemCount into WIDGET_ITEM_COUNT and defaults a non-number', () => {
    expect(normalizeWidgetConfig({ listId: 'x', itemCount: 999 }).itemCount).toBe(WIDGET_ITEM_COUNT.max);
    expect(normalizeWidgetConfig({ listId: 'x', itemCount: 0 }).itemCount).toBe(WIDGET_ITEM_COUNT.min);
    expect(normalizeWidgetConfig({ listId: 'x', itemCount: Number.NaN }).itemCount).toBe(
      DEFAULT_WIDGET_CONFIG.itemCount
    );
  });

  it('drops a custom theme whose palette is not six hex colors', () => {
    const c = normalizeWidgetConfig({
      listId: 'x',
      theme: 'custom',
      customColors: { background: 'red' } as never,
    });
    expect(c.theme).toBe(DEFAULT_WIDGET_CONFIG.theme);
    expect(c.customColors).toBeUndefined();
  });

  it('keeps a custom theme whose palette is valid', () => {
    const customColors = {
      background: '#111111',
      surface: '#222',
      text: '#ffffff',
      textSecondary: '#aaaaaa',
      accent: '#ff0000',
      border: '#333333',
    };
    const c = normalizeWidgetConfig({ listId: 'x', theme: 'custom', customColors });
    expect(c.theme).toBe('custom');
    expect(c.customColors).toEqual(customColors);
  });
});

describe('parseEmbedUrl — a hostile URL yields a renderable config', () => {
  it('size=huge no longer breaks generateIframeEmbed', () => {
    const c = parseEmbedUrl(url('size=huge'));
    expect(c).not.toBeNull();
    expect(WIDGET_DIMENSIONS[c!.size]).toBeDefined();
    expect(() => generateIframeEmbed(c!)).not.toThrow();
  });

  it('count=abc → default, count=999 → max', () => {
    expect(parseEmbedUrl(url('count=abc'))!.itemCount).toBe(DEFAULT_WIDGET_CONFIG.itemCount);
    expect(parseEmbedUrl(url('count=999'))!.itemCount).toBe(WIDGET_ITEM_COUNT.max);
  });

  it('radius=abc and radius=-4 → the default radius', () => {
    expect(parseEmbedUrl(url('radius=abc'))!.borderRadius).toBe(DEFAULT_WIDGET_CONFIG.borderRadius);
    expect(parseEmbedUrl(url('radius=-4'))!.borderRadius).toBe(DEFAULT_WIDGET_CONFIG.borderRadius);
  });

  it('theme=custom with a malformed colors string falls back rather than half-applying', () => {
    const c = parseEmbedUrl(url('theme=custom&colors=zz-zz-zz-zz-zz-zz'))!;
    expect(c.theme).toBe(DEFAULT_WIDGET_CONFIG.theme);
    expect(c.customColors).toBeUndefined();
  });

  it('round-trips a valid config through generateWidgetUrl', () => {
    const config = { listId: 'list-1', ...DEFAULT_WIDGET_CONFIG, size: 'full' as const, itemCount: 7 };
    expect(parseEmbedUrl(generateWidgetUrl(config))).toEqual(config);
  });
});

describe('EmbedCodeGenerator — options are normalized at construction', () => {
  it('an invalid size option renders the default dimensions instead of throwing', () => {
    const g = new EmbedCodeGenerator('list-1', { size: 'huge' as never, itemCount: 500 });
    expect(g.getDimensions()).toEqual(WIDGET_DIMENSIONS[DEFAULT_WIDGET_CONFIG.size]);
    expect(g.getConfig().itemCount).toBe(WIDGET_ITEM_COUNT.max);
    expect(() => g.generateAll()).not.toThrow();
  });
});
