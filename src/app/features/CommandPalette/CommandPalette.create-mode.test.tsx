// @vitest-environment jsdom
/**
 * CommandPalette create mode — Enter and click must name the same list.
 *
 * In create mode the palette shows suggestion rows ("top 10 soccer",
 * "top 25 soccer", …). Clicking a row creates THAT suggestion. Pressing Enter
 * with the same row highlighted must create the same list; and ArrowDown must
 * not be able to highlight a row that is not rendered.
 *
 * Negative control (recorded 2026-09-05, scan-sweep command-palette): against
 * the pre-fix component, "Enter creates the highlighted suggestion" was red
 * (Enter created from the raw query — size 10 — while the click created size
 * 25) and "ArrowDown stops on the last rendered row" was red (the counter
 * allowed one phantom row past the suggestions). 2/2 after.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { byTestId, click, h, mount, press, resetHarness, teardownHarness, type, unmount } from './CommandPalette.harness';

beforeEach(resetHarness);
afterEach(teardownHarness);

describe('CommandPalette create mode — keyboard/mouse parity', () => {
  it('Enter creates the highlighted suggestion, exactly as clicking it would', async () => {
    mount();
    type('new soccer');
    // rows: 0 "top 10 soccer", 1 "top 25 soccer", 2 "soccer all-time"
    expect(byTestId('command-palette-create-suggestion-1')?.textContent).toContain('top 25 soccer');
    press('ArrowDown');
    press('Enter');
    expect(h.createList).toHaveBeenCalledTimes(1);
    const viaKeyboard = h.createList.mock.calls[0][0];

    unmount();
    resetHarness();
    mount();
    type('new soccer');
    click(byTestId('command-palette-create-suggestion-1'));
    expect(h.createList).toHaveBeenCalledTimes(1);
    const viaClick = h.createList.mock.calls[0][0];

    expect(viaKeyboard.size).toBe(25);
    expect({ size: viaKeyboard.size, category: viaKeyboard.category, subcategory: viaKeyboard.subcategory, timePeriod: viaKeyboard.timePeriod })
      .toEqual({ size: viaClick.size, category: viaClick.category, subcategory: viaClick.subcategory, timePeriod: viaClick.timePeriod });
  });

  it('ArrowDown stops on the last rendered suggestion row', () => {
    mount();
    type('new soccer');
    const rows = ['command-palette-create-suggestion-0', 'command-palette-create-suggestion-1', 'command-palette-create-suggestion-2'];
    expect(byTestId('command-palette-create-suggestion-3')).toBeNull();
    for (let i = 0; i < 10; i++) press('ArrowDown');
    const highlighted = rows.filter((id) => byTestId(id)?.className.includes('bg-white/10'));
    expect(highlighted).toEqual(['command-palette-create-suggestion-2']);
  });
});
