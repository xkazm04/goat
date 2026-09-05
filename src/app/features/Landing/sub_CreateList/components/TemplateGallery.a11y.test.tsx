// @vitest-environment jsdom
/**
 * TemplateGallery — a template card is a control.
 *
 * Selecting a template is the whole point of the gallery, and it was a bare
 * `motion.div` with `onClick`: no role, no tab stop, no key handler. A keyboard
 * or screen-reader user could read every template in the modal and adopt none
 * of them, while the four category tabs above them were real buttons — so the
 * surface was half reachable, which is the shape that survives a manual pass.
 *
 * Two sibling implementations of this same card already got it right and are
 * what this test holds the gallery to: `FeaturedListsSection`'s MosaicCard
 * (role="button" + tabIndex + Enter/Space) in this very context, and
 * `CollectionCard`, fixed for the identical defect by the collections-manager
 * sweep on 2026-09-05.
 *
 * Negative control (recorded 2026-09-05, before the fix): 0 of 4 starter
 * template cards exposed role="button"; the keyboard cases below were red.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STARTER_TEMPLATES } from '@/types/templates';

vi.mock('@/hooks/use-top-lists', () => ({
  useTopLists: () => ({ data: [], isLoading: false, isError: false, error: null, refetch: () => {} }),
}));

const { TemplateGallery } = await import('./TemplateGallery');

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(onSelect: (t: { id: string }) => void = () => {}) {
  act(() => {
    root.render(<TemplateGallery onSelectTemplate={onSelect} />);
  });
}

function cards() {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-testid^="template-item-"]'),
  );
}

describe('TemplateGallery — every template is reachable without a mouse', () => {
  it('exposes each template card as a button in the accessibility tree', () => {
    render();

    const rendered = cards();
    expect(rendered.length).toBe(STARTER_TEMPLATES.length);
    expect(rendered.length).toBeGreaterThan(0);
    for (const card of rendered) {
      expect(card.getAttribute('role')).toBe('button');
    }
  });

  it('puts each template card in the tab order', () => {
    render();
    for (const card of cards()) {
      expect(card.getAttribute('tabindex')).toBe('0');
    }
  });

  it('names each card with the template it adopts', () => {
    render();
    const names = cards().map((c) => c.getAttribute('aria-label'));
    for (const template of STARTER_TEMPLATES) {
      expect(names).toContain(`Use template ${template.title}`);
    }
  });

  it('adopts a template on Enter', () => {
    vi.useFakeTimers();
    const picked: string[] = [];
    render((t) => picked.push(t.id));

    act(() => {
      cards()[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(picked).toEqual([STARTER_TEMPLATES[0].id]);
    vi.useRealTimers();
  });

  it('adopts a template on Space', () => {
    vi.useFakeTimers();
    const picked: string[] = [];
    render((t) => picked.push(t.id));

    act(() => {
      cards()[1].dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
      );
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(picked).toEqual([STARTER_TEMPLATES[1].id]);
    vi.useRealTimers();
  });

  it('still adopts a template on click', () => {
    vi.useFakeTimers();
    const picked: string[] = [];
    render((t) => picked.push(t.id));

    act(() => {
      cards()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    act(() => {
      vi.runAllTimers();
    });

    expect(picked).toEqual([STARTER_TEMPLATES[0].id]);
    vi.useRealTimers();
  });
});
