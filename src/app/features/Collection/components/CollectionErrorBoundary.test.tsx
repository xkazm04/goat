// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CollectionErrorBoundary } from './CollectionErrorBoundary';

/**
 * The boundary's fallback tells the user "The error has been logged and
 * reported." Until 2026-09-05 that sentence was false: the boundary wrote to
 * console.error and to a localStorage ring buffer and reported nothing — the
 * one crash class every match session can hit (the collection panel mounts on
 * every one) left no trace where an operator looks. error.tsx and
 * global-error.tsx already report to Sentry; this boundary now uses the same sink.
 *
 * Negative control (recorded 2026-09-05, before the fix): the fallback rendered
 * and `captureException` was called 0 times — the first test below was red.
 */

const captureException = vi.fn();
vi.mock('@sentry/nextjs', () => ({ captureException: (...args: unknown[]) => captureException(...args) }));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let shouldThrow = true;
function Bomb() {
  if (shouldThrow) throw new Error('panel exploded');
  return <div data-testid="recovered">ok</div>;
}

describe('CollectionErrorBoundary', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    shouldThrow = true;
    captureException.mockReset();
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    if (root) {
      const r = root;
      await act(async () => r.unmount());
      root = null;
    }
    container.remove();
    consoleError.mockRestore();
  });

  it('reports a caught render error to Sentry exactly once, with the component stack', async () => {
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(<CollectionErrorBoundary><Bomb /></CollectionErrorBoundary>);
    });

    expect(captureException).toHaveBeenCalledTimes(1);
    const [error, context] = captureException.mock.calls[0] as [Error, { contexts?: { react?: { componentStack?: string } } }];
    expect(error.message).toBe('panel exploded');
    expect(typeof context.contexts?.react?.componentStack).toBe('string');
    expect(container.querySelector('[data-testid="collection-error-boundary-fallback"]')).not.toBeNull();
  });

  it('still keeps the local debugging ring buffer and recovers on Try Again', async () => {
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(<CollectionErrorBoundary><Bomb /></CollectionErrorBoundary>);
    });
    const logs = JSON.parse(localStorage.getItem('collection-error-logs') ?? '[]') as Array<{ message: string }>;
    expect(logs.map((l) => l.message)).toEqual(['panel exploded']);

    shouldThrow = false;
    const retry = container.querySelector<HTMLButtonElement>('[data-testid="collection-error-retry-btn"]');
    expect(retry).not.toBeNull();
    await act(async () => {
      retry!.click();
    });
    expect(container.querySelector('[data-testid="recovered"]')).not.toBeNull();
  });
});
