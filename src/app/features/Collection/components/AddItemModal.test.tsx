// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useListStore } from '@/stores/use-list-store';

import { AddItemModal } from './AddItemModal';

/**
 * A new item is filed under the CURRENT LIST's category. With no list open the
 * modal cannot submit — and until 2026-09-05 it failed silently: handleSubmit
 * wrote `errors.category = 'Category is required'`, no JSX ever rendered
 * `errors.category`, and the Create button stayed enabled. The user typed a
 * name, pressed Create, and nothing happened, with no word about why.
 *
 * Negative control (recorded 2026-09-05, before the fix): with currentList
 * null and a name typed, the submit button was enabled and no message about
 * the category existed in the DOM — both assertions of the first test were red.
 */

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('AddItemModal without a current list', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  const originalList = useListStore.getState().currentList;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
    useListStore.setState({ currentList: originalList });
  });

  async function mount() {
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(<AddItemModal isOpen onClose={() => {}} />);
    });
  }

  it('says why it cannot submit and disables Create, even once a name is typed', async () => {
    useListStore.setState({ currentList: null });
    await mount();

    const name = document.querySelector<HTMLInputElement>('#add-item-name');
    expect(name).not.toBeNull();
    await act(async () => {
      typeInto(name!, 'Chrono Trigger');
    });

    expect(document.querySelector('[data-testid="add-item-category-missing"]')?.textContent).toMatch(/open a list/i);
    expect(document.querySelector<HTMLButtonElement>('[data-testid="add-item-submit-btn"]')?.disabled).toBe(true);
  });

  it('shows no such notice when a list is open', async () => {
    useListStore.setState({ currentList: { ...(originalList ?? {}), category: 'games' } as never });
    await mount();

    expect(document.querySelector('[data-testid="add-item-category-missing"]')).toBeNull();
    const category = document.querySelector<HTMLInputElement>('#add-item-category');
    expect(category?.value).toBe('games');
  });
});
