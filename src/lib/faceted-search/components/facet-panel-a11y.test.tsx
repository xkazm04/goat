// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FacetPanel } from './FacetPanel';

import type { Facet, FacetSelection, HierarchicalFacet } from '../types';

/**
 * Every control in this panel is a bare <button>, and several of them carry
 * their whole meaning in a glyph: the collapse chevron is "▼", the drill-down
 * arrow is "▶", and the value checkbox renders "✓" when selected and NOTHING
 * at all when it is not — so the control a user reaches for to ADD a filter is
 * the one with no accessible name.
 *
 * The counters below are the measurement, not a spot check: they walk whatever
 * the panel actually rendered, so a control added later without a name fails
 * this test rather than slipping past a hand-maintained list.
 */

/** A control's accessible name, as far as name-from-content and the two
 *  attributes used here go. */
function accessibleName(el: Element): string {
  return (
    el.getAttribute('aria-label') ??
    el.getAttribute('title') ??
    (el.textContent ?? '')
  ).trim();
}

function unnamedControls(rootEl: Element): string[] {
  return Array.from(rootEl.querySelectorAll('button, input'))
    .filter((el) => accessibleName(el) === '')
    .map((el) => el.outerHTML.slice(0, 80));
}

const facets: Facet[] = [
  {
    definition: {
      id: 'subcategory',
      field: 'subcategory',
      label: 'Subcategory',
      type: 'enum',
      defaultExpanded: true,
      maxVisible: 10,
    },
    // Six values so the in-facet search input renders (it is gated on > 5).
    values: ['RPG', 'FPS', 'Drama', 'Jazz', 'Essay', 'Doc'].map((v, i) => ({
      value: v,
      label: v,
      count: 2,
      percentage: 50,
      selected: i === 0,
    })),
    totalCount: 12,
    selectedCount: 1,
    isExpanded: true,
    isLoading: false,
  },
];

const hierarchicalFacets: HierarchicalFacet[] = [
  {
    definition: {
      id: 'category',
      field: 'category',
      label: 'Category',
      type: 'hierarchy',
      defaultExpanded: true,
    },
    // Six nodes so the hierarchical search input renders too.
    nodes: ['Games', 'Films', 'Books', 'Music', 'Art', 'Food'].map((v) => ({
      value: v,
      label: v,
      count: 2,
      level: 0,
      selected: false,
      expanded: v === 'Games',
      children:
        v === 'Games'
          ? [
              {
                value: 'RPG',
                label: 'RPG',
                count: 2,
                level: 1,
                parentValue: 'Games',
                selected: false,
                expanded: false,
                children: [],
              },
            ]
          : [],
    })),
    expandedPath: [],
    totalCount: 12,
    selectedCount: 0,
    isExpanded: true,
    isLoading: false,
  },
];

const selections: FacetSelection[] = [
  { facetId: 'subcategory', field: 'subcategory', values: ['RPG'] },
];

describe('FacetPanel accessibility', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      const r = root;
      await act(async () => r.unmount());
      root = null;
    }
    container.remove();
  });

  async function render() {
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(
        <FacetPanel
          facets={facets}
          hierarchicalFacets={hierarchicalFacets}
          selections={selections}
          onToggleValue={vi.fn()}
          onClearFacet={vi.fn()}
          onClearAll={vi.fn()}
          onDrillDown={vi.fn()}
          onDrillUp={vi.fn()}
          facetSearchTerms={{}}
          onFacetSearchChange={vi.fn()}
        />,
      );
    });
  }

  it('gives every control an accessible name', async () => {
    await render();
    expect(unnamedControls(container)).toEqual([]);
  });

  it('states collapsed/expanded on the controls that collapse things', async () => {
    await render();
    const expanders = Array.from(container.querySelectorAll('[aria-expanded]'));
    // Two section headers plus the one node that has children.
    expect(expanders).toHaveLength(3);
    for (const el of expanders) {
      expect(['true', 'false']).toContain(el.getAttribute('aria-expanded'));
    }
  });

  it('states selected/unselected on the value controls that act as checkboxes', async () => {
    await render();
    const pressed = Array.from(container.querySelectorAll('[aria-pressed]'));
    // Six facet values plus six top-level nodes. The one child node is not in
    // the count: nothing is selected, so the tree opens collapsed.
    expect(pressed).toHaveLength(12);
    expect(pressed.filter((el) => el.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
  });
});
