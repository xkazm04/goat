// @vitest-environment jsdom
/**
 * UniversalSelect — keyboard selection calls the CURRENT onChange.
 *
 * `handleKeyDown` was memoised over `isOpen` / `filteredOptions` /
 * `highlightedIndex` and called a `handleSelect` declared after it, which the
 * dependency list did not name. When a parent re-rendered with a new
 * `onChange` while those three stayed put, Enter still called the old one.
 *
 * Negative control (recorded 2026-09-05, scan-sweep core-ui, pre-fix tree):
 * "Enter calls the onChange of the latest render" was red — the FIRST
 * callback received the value, the second received nothing — and the
 * aria-labelledby assertion was red (the bare <label> referenced nothing).
 * 2 of 3 red pre-fix, 3/3 green on this tree.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => {
  const MOTION_PROPS = new Set(['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'layout']);
  const motion = new Proxy({} as Record<string, React.ElementType>, {
    get: (_t, tag: string) => {
      const Plain = React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
        const rest: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(props)) if (!MOTION_PROPS.has(k)) rest[k] = v;
        return React.createElement(tag, { ...rest, ref });
      });
      Plain.displayName = `motion.${tag}`;
      return Plain;
    },
  });
  return { motion, AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</> };
});

import { UniversalSelect } from './universal-select';

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta', disabled: true },
  { value: 'c', label: 'Gamma' },
];

describe('UniversalSelect keyboard', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    // jsdom has no layout; the component scrolls the highlighted option into view.
    Element.prototype.scrollIntoView = vi.fn();
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
  const trigger = () => container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  const key = async (el: Element, k: string) => {
    await act(async () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    });
  };

  it('Enter calls the onChange of the latest render, not the one captured at open', async () => {
    const first = vi.fn();
    const second = vi.fn();
    await render(<UniversalSelect value="" onChange={first} options={OPTIONS} />);
    await key(trigger(), 'ArrowDown'); // opens
    await key(trigger(), 'ArrowDown'); // highlights Alpha
    await render(<UniversalSelect value="" onChange={second} options={OPTIONS} />);
    await key(trigger(), 'Enter');
    expect(second).toHaveBeenCalledWith('a');
    expect(first).not.toHaveBeenCalled();
  });

  it('arrow keys skip disabled options and Enter selects the highlighted one', async () => {
    const onChange = vi.fn();
    await render(<UniversalSelect value="" onChange={onChange} options={OPTIONS} />);
    await key(trigger(), 'ArrowDown');
    await key(trigger(), 'ArrowDown'); // Alpha
    await key(trigger(), 'ArrowDown'); // Gamma (Beta is disabled)
    expect(trigger().getAttribute('aria-activedescendant')).toMatch(/-opt-2$/);
    await key(trigger(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('c');
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('Escape closes the list and the trigger is labelled by its label', async () => {
    await render(<UniversalSelect value="a" onChange={() => {}} options={OPTIONS} label="Sort" />);
    await key(trigger(), 'Enter');
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
    await key(trigger(), 'Escape');
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    const labelledBy = trigger().getAttribute('aria-labelledby');
    expect(document.getElementById(labelledBy!)?.textContent).toBe('Sort');
  });
});
