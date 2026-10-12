// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ONE rule — "count the matched positions a persisted session holds" — has two
 * implementations in this context, and only one of them was hardened.
 *
 * `ContinueRankingBar.tsx:79-82` reads the same sessions defensively
 * (`session.gridItems ?? []`, `item?.context?.matched`), and so does
 * `session-store.ts` itself in `partialize` (`state.listSessions[k]?.updatedAt
 * || 0`) and at line 244 (`session.backlogGroups || []`). `useListProgress.ts`
 * did not: it read `session.gridItems.filter((item) => item.context.matched)`.
 *
 * The static type says both fields are present, but the value does not come
 * from the type — it comes from `localStorage` via zustand `persist`, which
 * carries NO `version` and NO `migrate` (session-store.ts:537). Any JSON a past
 * release wrote is rehydrated verbatim, so a session missing `gridItems`, or
 * holding a grid entry without `context`, reaches this hook and throws a
 * TypeError during render of `UserListCard` — the landing page's own list.
 *
 * These cases are the sibling implementation's guards, applied to this one.
 */

const listSessions: Record<string, unknown> = {};

vi.mock('@/stores/session-store', () => ({
  useSessionStore: (selector: (s: { listSessions: unknown }) => unknown) =>
    selector({ listSessions }),
}));

const { useListProgress } = await import('./useListProgress');

let container: HTMLDivElement;
let root: Root;

/**
 * The hook's result is read back out of the rendered DOM rather than captured
 * into an outer variable: assigning to a closure during render is the side
 * effect `react-hooks/globals` forbids, and reading the painted output is what
 * the user actually gets anyway.
 */
function Probe({ listId, listSize }: { listId: string; listSize: number }) {
  const progress = useListProgress(listId, listSize);
  return <output>{JSON.stringify(progress)}</output>;
}

function readProgress(listId: string, listSize: number): ReturnType<typeof useListProgress> {
  act(() => {
    root.render(<Probe listId={listId} listSize={listSize} />);
  });
  return JSON.parse(container.querySelector('output')!.textContent!);
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  for (const k of Object.keys(listSessions)) delete listSessions[k];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useListProgress — a session rehydrated from an older schema', () => {
  it('survives a persisted session with no gridItems array at all', () => {
    listSessions['list-a'] = { listSize: 10, updatedAt: '2026-01-01T00:00:00.000Z' };

    const progress = readProgress('list-a', 10);

    expect(progress.filled).toBe(0);
    expect(progress.total).toBe(10);
    expect(progress.hasSession).toBe(true);
  });

  it('survives a grid entry that carries no context object', () => {
    listSessions['list-b'] = {
      listSize: 4,
      gridItems: [
        { context: { matched: true } },
        {},
        null,
        { context: { matched: true } },
      ],
    };

    const progress = readProgress('list-b', 4);

    expect(progress.filled).toBe(2);
    expect(progress.percentage).toBe(50);
    expect(progress.isComplete).toBe(false);
  });

  it('still reports a healthy session exactly as before', () => {
    listSessions['list-c'] = {
      listSize: 5,
      gridItems: [
        { context: { matched: true } },
        { context: { matched: true } },
        { context: { matched: false } },
        { context: { matched: false } },
        { context: { matched: false } },
      ],
    };

    const progress = readProgress('list-c', 5);

    expect(progress).toEqual({
      filled: 2,
      total: 5,
      percentage: 40,
      isComplete: false,
      hasSession: true,
    });
  });

  it('reports no session when the list has never been ranked', () => {
    expect(readProgress('list-missing', 7)).toEqual({
      filled: 0,
      total: 7,
      percentage: 0,
      isComplete: false,
      hasSession: false,
    });
  });
});
