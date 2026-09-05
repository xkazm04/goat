// @vitest-environment jsdom
/**
 * StarRating — what assistive technology hears.
 *
 * The rating is one fact. In display mode the container carries it once
 * (role="img", "Rated 3.5 out of 5") and the stars are decorative. In
 * interactive mode each star is a real button with the value marked pressed.
 *
 * Negative control (recorded 2026-09-05, scan-sweep core-ui, pre-fix tree):
 * display mode rendered five DISABLED <button aria-label="Rate N out of 5">
 * and no element carried the value; interactive buttons carried no
 * aria-pressed. All 3 tests red against that tree, 3/3 green on this one.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StarRating } from './star-rating';

describe('StarRating', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    const r = root;
    if (r) await act(async () => r.unmount());
    root = null;
    container.remove();
  });
  const render = async (ui: React.ReactElement) => { const r = root!; await act(async () => r.render(ui)); };

  it('display mode announces the value once', async () => {
    await render(<StarRating value={3.5} />);
    const img = container.querySelector('[role="img"]');
    expect(img?.getAttribute('aria-label')).toBe('Rated 3.5 out of 5');
    expect(container.querySelectorAll('[aria-label^="Rate "]').length).toBe(0);
  });

  it('display mode has no controls', async () => {
    await render(<StarRating value={4} maxRating={5} />);
    expect(container.querySelectorAll('button').length).toBe(0);
    expect(container.querySelectorAll('span[data-testid^="star-"][aria-hidden="true"]').length).toBe(5);
  });

  it('interactive mode exposes one button per star, the current value pressed', async () => {
    const onChange = vi.fn();
    await render(<StarRating value={2} interactive onChange={onChange} />);
    const buttons = container.querySelectorAll<HTMLButtonElement>('button');
    expect(buttons.length).toBe(5);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[4].getAttribute('aria-pressed')).toBe('false');
    await act(async () => { buttons[4].click(); });
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
