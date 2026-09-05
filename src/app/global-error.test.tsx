// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GlobalError from './global-error';

/**
 * `global-error.tsx` is the boundary for a failure IN THE ROOT LAYOUT — the
 * most severe crash the app can have, and the one class `error.tsx` (which
 * does call Sentry) never sees. If this boundary reports nothing, the worst
 * failures are exactly the ones that leave no trace.
 *
 * Negative control (recorded 2026-09-05, before the fix): the component
 * rendered its fallback and `captureException` was called 0 times — the
 * first assertion below was red.
 */

const captureException = vi.fn();
vi.mock('@sentry/nextjs', () => ({ captureException: (...args: unknown[]) => captureException(...args) }));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

describe('GlobalError (root layout boundary)', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    captureException.mockReset();
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
  });

  it('reports the error to Sentry exactly once on mount', async () => {
    const error = Object.assign(new Error('layout exploded'), { digest: 'abc123' });
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(<GlobalError error={error} reset={() => {}} />);
    });
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it('still renders the self-contained fallback with a working reset', async () => {
    const reset = vi.fn();
    root = createRoot(container);
    const r = root;
    await act(async () => {
      r.render(<GlobalError error={new Error('boom')} reset={reset} />);
    });
    const tryAgain = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Try again',
    );
    expect(tryAgain).toBeDefined();
    await act(async () => {
      tryAgain!.click();
    });
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
