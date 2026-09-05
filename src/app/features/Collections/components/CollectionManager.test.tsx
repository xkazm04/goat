// @vitest-environment jsdom
/**
 * CollectionManager — the form must describe the collection it was opened for.
 *
 * The dialog is rendered permanently by CollectionsDashboard and toggled with
 * `isOpen`. Its form state used to be initialised from props once, at mount,
 * so it described whichever collection the dashboard happened to pass on the
 * very first render and never anything else: edit A, close, edit B → the
 * fields still read A; create after an edit → "New Collection" pre-filled with
 * the last edited collection's name, colour and visibility.
 *
 * Negative control (recorded 2026-09-05, scan-sweep collections-manager):
 * against the pre-fix component both cases below failed — "Alpha" where "Beta"
 * was expected, and "Alpha" where "" was expected. Green once the form mounts
 * per open.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionManager } from './CollectionManager';

import type { ListCollection } from '@/types/collection';

vi.mock('@/hooks/use-motion-preference', () => ({
  useMotionCapabilities: () => ({ allowTransitions: false, allowAmbient: false }),
}));

const collection = (over: Partial<ListCollection>): ListCollection => ({
  id: 'c',
  name: 'Unnamed',
  description: null,
  coverImage: null,
  color: '#06b6d4',
  icon: 'folder',
  parentId: null,
  userId: 'u1',
  listIds: [],
  isPublic: false,
  shareSlug: null,
  order: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});

const alpha = collection({ id: 'a', name: 'Alpha', isPublic: true, color: '#ef4444' });
const beta = collection({ id: 'b', name: 'Beta', description: 'second' });

let host: HTMLDivElement;
let root: Root;
const noop = async () => {};

async function render(el: React.ReactElement) {
  await act(async () => root.render(el));
}
// AnimatePresence keeps the CLOSING dialog mounted until its exit animation
// settles, so right after a re-open two dialogs can coexist for a frame. The
// newest one is the last in document order — that is the one the user sees
// settle, and the one this contract is about.
const last = <T extends Element>(sel: string) => Array.from(host.querySelectorAll<T>(sel)).at(-1);
const nameInput = () => last<HTMLInputElement>('#collection-name');
const heading = () => last('h2')?.textContent;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe('CollectionManager form state follows the collection it is opened for', () => {
  it('editing B after editing A shows B, not A', async () => {
    await render(<CollectionManager isOpen collection={alpha} onClose={noop} onSave={noop} />);
    expect(nameInput()?.value).toBe('Alpha');
    expect(heading()).toBe('Edit Collection');

    await render(<CollectionManager isOpen={false} collection={null} onClose={noop} onSave={noop} />);
    await render(<CollectionManager isOpen collection={beta} onClose={noop} onSave={noop} />);

    expect(nameInput()?.value).toBe('Beta');
    expect(last<HTMLTextAreaElement>('#collection-description')?.value).toBe('second');
  });

  it('"New Collection" after an edit opens empty and private', async () => {
    await render(<CollectionManager isOpen collection={alpha} onClose={noop} onSave={noop} />);
    expect(nameInput()?.value).toBe('Alpha');

    await render(<CollectionManager isOpen={false} collection={null} onClose={noop} onSave={noop} />);
    await render(<CollectionManager isOpen collection={null} onClose={noop} onSave={noop} />);

    expect(heading()).toBe('New Collection');
    expect(nameInput()?.value).toBe('');
    expect(host.textContent).toContain('Only you can see this collection');
  });

  it('opens straight on the confirmation step when the delete was requested elsewhere', async () => {
    const onDelete = vi.fn(async () => {});
    await render(
      <CollectionManager isOpen collection={alpha} onClose={noop} onSave={noop} onDelete={onDelete} confirmDeleteOnOpen />
    );
    expect(host.textContent).toContain('Are you sure?');
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('a rejected delete stays open and says so, instead of closing over the surviving collection', async () => {
    const onClose = vi.fn();
    const onDelete = vi.fn(async () => { throw new Error('server said no'); });
    await render(
      <CollectionManager isOpen collection={alpha} onClose={onClose} onSave={noop} onDelete={onDelete} confirmDeleteOnOpen />
    );
    const confirm = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'Delete');
    expect(confirm).toBeDefined();
    await act(async () => confirm!.click());
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(host.textContent).toContain('server said no');
  });
});
