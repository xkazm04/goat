// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFeedbackPipeline } from './useFeedbackPipeline';

import type { FeedbackPipelineResult } from './types';

/**
 * `execute` may be called again while it is still running — a user pressing
 * Generate twice, a modal reopened on new input — and the awaited operation
 * resolves in COMPLETION order, not invocation order. Before the run token,
 * the slow first call's result landed on top of the fast second call's, so the
 * surface showed the answer to a question the user had already replaced, with
 * nothing to say it was stale.
 *
 * Negative control (recorded 2026-09-05, before the guard): both of the first
 * two tests were red — `result` came back 'slow-A' and the error case flipped
 * the live pipeline to 'error'.
 */

let container: HTMLDivElement;
let root: Root;

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function mount(operation: (data: string) => Promise<string>) {
  const seenRef: { current: FeedbackPipelineResult<string, string> | null } = { current: null };
  function Probe({ publish }: { publish: (api: FeedbackPipelineResult<string, string>) => void }) {
    const api = useFeedbackPipeline<string, string>({ id: 'probe', operation });
    // Published from an effect rather than assigned during render, so the
    // probe stays a well-behaved component under react-hooks/immutability.
    useEffect(() => {
      publish(api);
    });
    return null;
  }
  act(() =>
    root.render(
      <Probe
        publish={(api) => {
          seenRef.current = api;
        }}
      />
    )
  );
  return seenRef;
}

describe('useFeedbackPipeline — a superseded run does not repaint the surface', () => {
  it('keeps the newest run result when an older one finishes last', async () => {
    const slow = deferred<string>();
    const fast = deferred<string>();
    const calls: Array<{ promise: Promise<string> }> = [slow, fast];
    let n = 0;

    const seenRef = mount(() => calls[n++].promise);

    let firstCall: Promise<string | null>;
    let secondCall: Promise<string | null>;
    act(() => {
      firstCall = seenRef.current!.execute('A');
      secondCall = seenRef.current!.execute('B');
    });

    // B finishes first and paints; A — already superseded — finishes second.
    await act(async () => {
      fast.resolve('fast-B');
      await secondCall;
    });
    expect(seenRef.current!.result).toBe('fast-B');

    await act(async () => {
      slow.resolve('slow-A');
      await firstCall;
    });

    expect(seenRef.current!.result).toBe('fast-B');
    expect(seenRef.current!.isSuccess).toBe(true);
  });

  it('does not let a superseded run failure flip the live pipeline to error', async () => {
    const doomed = deferred<string>();
    const good = deferred<string>();
    const calls: Array<{ promise: Promise<string> }> = [doomed, good];
    let n = 0;

    const seenRef = mount(() => calls[n++].promise);

    let firstCall: Promise<string | null>;
    let secondCall: Promise<string | null>;
    act(() => {
      firstCall = seenRef.current!.execute('A');
      secondCall = seenRef.current!.execute('B');
    });

    await act(async () => {
      good.resolve('ok-B');
      await secondCall;
    });

    await act(async () => {
      doomed.reject(new Error('abandoned request died'));
      await firstCall;
    });

    expect(seenRef.current!.isError).toBe(false);
    expect(seenRef.current!.error).toBeNull();
    expect(seenRef.current!.result).toBe('ok-B');
  });

  it('still reports a failure when nothing has superseded the run', async () => {
    const only = deferred<string>();
    const seenRef = mount(() => only.promise);

    let call: Promise<string | null>;
    act(() => {
      call = seenRef.current!.execute('A');
    });

    await act(async () => {
      only.reject(new Error('the real failure'));
      await call;
    });

    expect(seenRef.current!.isError).toBe(true);
    expect(seenRef.current!.error?.message).toBe('the real failure');
  });
});
