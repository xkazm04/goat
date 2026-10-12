// @vitest-environment jsdom
/**
 * CommandPalette — what assistive technology is told.
 *
 * A modal search box with arrow-key selection is a dialog containing a
 * combobox over a listbox. Each claim below is one attribute a screen reader
 * reads; the test collects every missing one so the count is the measurement.
 *
 * Negative control (recorded 2026-09-05, scan-sweep command-palette): against
 * the pre-fix component the violation list had 11 entries (no dialog role, no
 * aria-modal, no dialog name, input without combobox role / aria-expanded /
 * aria-controls / name, rows without option role or aria-selected, icon-only
 * clear button without a name) and aria-activedescendant was null. 0 after.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { byTestId, getContainer, h, input, makeList, mount, press, resetHarness, teardownHarness, type } from './CommandPalette.harness';

beforeEach(resetHarness);
afterEach(teardownHarness);

describe('CommandPalette accessibility semantics', () => {
  it('exposes dialog + combobox + listbox semantics with names', () => {
    h.topLists = { data: [makeList('l1', 'NBA Legends'), makeList('l2', 'NBA Rookies')], isLoading: false, error: null };
    mount();
    type('nba');

    const violations: string[] = [];
    const dialog = byTestId('command-palette-container')!;
    if (dialog.getAttribute('role') !== 'dialog') violations.push('container lacks role=dialog');
    if (dialog.getAttribute('aria-modal') !== 'true') violations.push('container lacks aria-modal=true');
    if (!dialog.getAttribute('aria-label') && !dialog.getAttribute('aria-labelledby')) violations.push('dialog has no name');

    const box = input();
    if (box.getAttribute('role') !== 'combobox') violations.push('input lacks role=combobox');
    if (box.getAttribute('aria-expanded') !== 'true') violations.push('input lacks aria-expanded');
    const controls = box.getAttribute('aria-controls');
    const listbox = controls ? getContainer().querySelector(`#${controls}`) : null;
    if (!listbox) violations.push('input aria-controls does not point at a rendered element');
    else if (listbox.getAttribute('role') !== 'listbox') violations.push('results container lacks role=listbox');
    if (!box.getAttribute('aria-label') && !box.getAttribute('aria-labelledby')) violations.push('input has no name');

    const first = byTestId('command-palette-list-0')!;
    if (first.getAttribute('role') !== 'option') violations.push('result row lacks role=option');
    if (first.getAttribute('aria-selected') !== 'true') violations.push('highlighted row lacks aria-selected=true');
    if (byTestId('command-palette-list-1')!.getAttribute('aria-selected') !== 'false') violations.push('unselected row lacks aria-selected=false');

    const clear = byTestId('command-palette-clear-btn')!;
    if (!clear.getAttribute('aria-label')) violations.push('icon-only clear button has no name');

    expect(violations).toEqual([]);
  });

  it('the selected option is announced through aria-activedescendant as ArrowDown moves', () => {
    h.topLists = { data: [makeList('l1', 'NBA Legends'), makeList('l2', 'NBA Rookies')], isLoading: false, error: null };
    mount();
    type('nba');
    const before = input().getAttribute('aria-activedescendant');
    expect(before).toBeTruthy();
    expect(getContainer().querySelector(`#${before}`)).toBe(byTestId('command-palette-list-0'));
    press('ArrowDown');
    const after = input().getAttribute('aria-activedescendant');
    expect(getContainer().querySelector(`#${after}`)).toBe(byTestId('command-palette-list-1'));
    expect(byTestId('command-palette-list-1')!.getAttribute('aria-selected')).toBe('true');
    expect(byTestId('command-palette-list-0')!.getAttribute('aria-selected')).toBe('false');
  });
});
