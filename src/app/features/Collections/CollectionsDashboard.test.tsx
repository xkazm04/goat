// @vitest-environment jsdom
/**
 * CollectionsDashboard — the wiring between sidebar, view and dialog.
 *
 * The stores and query hooks are replaced by shape-preserving stand-ins so the
 * assertions are about what the dashboard DOES with a click, not about zustand
 * or TanStack Query. Children render for real.
 *
 * Negative controls (recorded 2026-09-05, scan-sweep collections-manager),
 * each against the pre-fix dashboard:
 *  - "sidebar Delete asks before deleting": `remove` was called on the menu
 *    click itself, with no confirmation step (calls=1 where 0 expected).
 *  - "a refused delete is reported, not closed over": the dashboard's own
 *    catch swallowed the rejection, so the dialog read success and closed —
 *    no error text, no dialog.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionsDashboard } from './CollectionsDashboard';

import type { ListCollection } from '@/types/collection';
import type { TopList } from '@/types/top-lists';

const fake = vi.hoisted(() => {
  const state = {
    collections: [] as ListCollection[],
    selectedCollectionId: null as string | null,
    expanded: new Set<string>(),
    isLoading: false,
    hasLoaded: true,
  };
  const ops = {
    create: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    addLists: vi.fn(async () => {}),
    removeList: vi.fn(async () => {}),
    reorderLists: vi.fn(async () => {}),
    isPending: false,
  };
  const query = { data: undefined as unknown, isLoading: false, isError: false, error: null as unknown, refetch: vi.fn() };
  const actions = {
    setSelectedCollection: vi.fn((id: string | null) => { state.selectedCollectionId = id; }),
    toggleCollectionExpanded: vi.fn(),
  };
  return { state, ops, query, actions, user: { id: 'u1', name: 'Kaz' } as { id: string; name: string } | null, lists: [] as TopList[] };
});

vi.mock('@/hooks/use-collections', () => ({
  useUserCollections: () => fake.query,
  useCollectionOperations: () => fake.ops,
}));
vi.mock('@/stores/collection-store', () => ({
  useCollectionStore: (sel: (s: typeof fake.state) => unknown) => sel(fake.state),
  useCollectionActions: () => fake.actions,
  useCollections: () => fake.state.collections,
  useCollectionTree: () =>
    fake.state.collections
      .filter((c) => !c.parentId)
      .map((c) => ({ collection: c, children: [], depth: 0, isExpanded: fake.state.expanded.has(c.id) })),
  useCollectionUIState: () => ({ isLoading: fake.state.isLoading, hasLoaded: fake.state.hasLoaded }),
}));
vi.mock('@/stores/use-list-store', () => ({
  useCurrentUser: () => fake.user,
  useUserLists: () => fake.lists,
}));
vi.mock('@/hooks/use-motion-preference', () => ({
  useMotionCapabilities: () => ({ allowTransitions: false, allowAmbient: false }),
}));
vi.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => true }));
vi.mock('@/lib/dnd', () => ({ DRAG_ACTIVATION_DISTANCE_PX: 6 }));
vi.mock('@/components/illustrations/EmptyStateIllustrations', () => ({
  EmptyTrophyCase: () => <span data-testid="empty-illustration" />,
  NoSearchResults: () => <span data-testid="no-results-illustration" />,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>{children}</a>
  ),
}));


const collection = (over: Partial<ListCollection>): ListCollection => ({
  id: 'c',
  name: 'Unnamed',
  description: null,
  coverImage: null,
  color: '#06b6d4',
  icon: null,
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

let host: HTMLDivElement;
let root: Root;
const render = async (el: React.ReactElement) => { await act(async () => root.render(el)); };
const buttons = () => Array.from(host.querySelectorAll('button'));
// AnimatePresence keeps a closing menu in the DOM for a frame, so the NEWEST
// match (last in document order) is the one the user is looking at.
const buttonNamed = (text: string) => buttons().filter((b) => b.textContent?.trim() === text).at(-1);
const dialogHeading = () => Array.from(host.querySelectorAll('h2')).at(-1)?.textContent;
const click = async (el: Element | undefined) => {
  expect(el, 'element to click').toBeDefined();
  await act(async () => (el as HTMLElement).click());
};

/** The sidebar row for a collection, and its "more" menu toggle. */
function sidebarRow(name: string) {
  const label = Array.from(host.querySelectorAll('span')).find((s) => s.textContent === name);
  expect(label, `sidebar row "${name}"`).toBeDefined();
  return label!.parentElement as HTMLElement;
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  fake.state.collections = [collection({ id: 'a', name: 'Alpha' }), collection({ id: 'b', name: 'Beta', order: 1 })];
  fake.state.selectedCollectionId = null;
  fake.ops.remove.mockReset();
  fake.ops.remove.mockImplementation(async () => {});
  fake.actions.setSelectedCollection.mockClear();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe('CollectionsDashboard — deleting a collection', () => {
  it('sidebar Delete asks before deleting', async () => {
    await render(<CollectionsDashboard />);
    await click(sidebarRow('Alpha').querySelector('button') ?? undefined);
    await click(buttonNamed('Delete'));

    expect(fake.ops.remove).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Are you sure?');

    await click(buttonNamed('Delete'));
    expect(fake.ops.remove).toHaveBeenCalledWith({ collectionId: 'a' });
  });

  it('a refused delete is reported, not closed over', async () => {
    fake.ops.remove.mockImplementation(async () => { throw new Error('still referenced'); });
    await render(<CollectionsDashboard />);
    await click(sidebarRow('Beta').querySelector('button') ?? undefined);
    await click(buttonNamed('Delete'));
    await click(buttonNamed('Delete'));

    expect(fake.ops.remove).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('still referenced');
    expect(dialogHeading()).toBe('Edit Collection');
  });
});
