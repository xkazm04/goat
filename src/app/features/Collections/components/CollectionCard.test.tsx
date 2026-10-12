// @vitest-environment jsdom
/**
 * CollectionCard — a selectable card is a control, in every variant.
 *
 * The card is the primary way a collection is opened from the landing page
 * (CollectionsSection renders variant="default" with onSelect). All three
 * variants were `div onClick` with no role, no tab stop and no key handling,
 * so a keyboard user could see the collections and open none of them.
 *
 * Negative control (recorded 2026-09-05, scan-sweep collections-manager):
 * against the pre-fix component every variant failed at the first assertion —
 * no element with role="button" — 0 of 3 variants reachable.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionCard } from './CollectionCard';

import type { ListCollection } from '@/types/collection';

vi.mock('@/hooks/use-3d-tilt', () => ({
  use3DTilt: () => ({ ref: () => {}, style: {}, handlers: {} }),
}));
vi.mock('next/image', () => ({
  // A stand-in that keeps the accessible name and nothing else; the card's
  // images are not under test here.
  default: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt ?? ''} />,
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const alpha: ListCollection = {
  id: 'a',
  name: 'Alpha',
  description: null,
  coverImage: null,
  color: '#ef4444',
  icon: null,
  parentId: null,
  userId: 'u1',
  listIds: ['l1', 'l2'],
  isPublic: true,
  shareSlug: 'alpha',
  order: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

const VARIANTS = ['default', 'compact', 'minimal'] as const;

describe('CollectionCard is reachable and operable from the keyboard', () => {
  it.each(VARIANTS)('variant=%s: Tab reaches the card, Enter and Space select it', async (variant) => {
    const onSelect = vi.fn();
    await act(async () => root.render(<CollectionCard collection={alpha} variant={variant} onSelect={onSelect} />));

    const control = host.querySelector<HTMLElement>('[role="button"][tabindex="0"]');
    expect(control, `${variant}: a focusable role=button element`).not.toBeNull();

    await act(async () => {
      control!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await act(async () => {
      control!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(alpha);
  });

  it('a card with nothing to select is not announced as a button', async () => {
    await act(async () => root.render(<CollectionCard collection={alpha} variant="default" />));
    expect(host.querySelector('[role="button"]')).toBeNull();
  });
});
