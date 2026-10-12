// @vitest-environment jsdom
/**
 * CriteriaTemplateSection — a control may not be nested inside another control.
 *
 * The section header was a `motion.button` (line 68) and the "clear the
 * selected profile" X was a second `motion.button` rendered INSIDE it (line
 * 104). Both render a real `<button>`, so the markup was
 * `<button>…<button/>…</button>`: invalid per the HTML content model
 * (a `button`'s content model forbids interactive descendants), which React
 * reports as a `validateDOMNesting` warning and which browsers resolve by
 * reparenting — the parse tree the user's browser builds is not the tree the
 * component describes, so which control a click lands on stops being decidable
 * from the source.
 *
 * Negative control (recorded 2026-09-05, before the fix): with a profile
 * selected, 1 nested button pair was present and the first assertion below was
 * red.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CriteriaProfile } from '@/lib/criteria/types';

const selected: CriteriaProfile = {
  id: 'p1',
  name: 'Athletic Impact',
  description: 'Scoring for sports rankings',
  category: 'sports',
  criteria: [
    { id: 'c1', name: 'Peak', description: '', weight: 1, scale: { min: 0, max: 10 } },
  ],
} as unknown as CriteriaProfile;

vi.mock('@/stores/criteria-store', () => ({
  useCriteriaStore: (selector: (s: { profiles: CriteriaProfile[] }) => unknown) =>
    selector({ profiles: [selected] }),
}));
vi.mock('@/lib/criteria/templates', () => ({
  mapCategoryToTemplate: (c: string) => c,
  getTemplatesForCategory: () => [selected],
}));

const { CriteriaTemplateSection } = await import('./CriteriaTemplateSection');

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

function render(selectedProfileId: string | null) {
  act(() => {
    root.render(
      <CriteriaTemplateSection
        category="sports"
        selectedProfileId={selectedProfileId}
        onProfileSelect={() => {}}
      />,
    );
  });
}

function nestedButtonCount() {
  return Array.from(container.querySelectorAll('button')).filter(
    (b) => b.querySelector('button') !== null,
  ).length;
}

describe('CriteriaTemplateSection header controls', () => {
  it('nests no button inside another button when a profile is selected', () => {
    render('p1');
    expect(nestedButtonCount()).toBe(0);
  });

  it('nests no button inside another button when nothing is selected', () => {
    render(null);
    expect(nestedButtonCount()).toBe(0);
  });

  it('still offers both the expand toggle and the clear control', () => {
    render('p1');

    const expand = container.querySelector('[data-testid="criteria-section-toggle"]');
    const clear = container.querySelector('[data-testid="criteria-section-clear"]');

    expect(expand).not.toBeNull();
    expect(expand!.tagName).toBe('BUTTON');
    expect(expand!.getAttribute('aria-expanded')).toBe('false');
    expect(clear).not.toBeNull();
    expect(clear!.tagName).toBe('BUTTON');
    // The clear control is a distinct target, not a descendant of the toggle.
    expect(expand!.contains(clear!)).toBe(false);
  });

  it('names the clear control for a screen reader', () => {
    render('p1');
    const clear = container.querySelector('[data-testid="criteria-section-clear"]')!;
    expect(clear.getAttribute('aria-label')).toBe('Clear rating criteria');
  });

  it('expands the template grid when the toggle is pressed', () => {
    render(null);
    const expand = container.querySelector<HTMLButtonElement>(
      '[data-testid="criteria-section-toggle"]',
    )!;

    act(() => {
      expand.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(
      container
        .querySelector('[data-testid="criteria-section-toggle"]')!
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });
});
