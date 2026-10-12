'use client';

import { useEffect, useState } from 'react';

/**
 * How long a deferred mount may wait for an idle period before it is forced.
 * Idle may never arrive on a busy machine; deferral degrades to "shortly after
 * mount", never to "never" (registry: client-fetch-cache/prefetch-and-defer).
 */
export const DEFERRED_MOUNT_IDLE_TIMEOUT_MS = 2000;

/**
 * Run `callback` once the first paint is behind us — in an idle period when
 * the browser offers one, else on the frame after next. Returns the reaper
 * that cancels whichever primitive is still pending.
 *
 * This is the ONE implementation of the idle-defer schedule for the provider
 * shell. It used to live twice — in DeferredProviders and MatchProviders — and
 * the requestAnimationFrame fallback (Safari and WebKit webviews, which have no
 * requestIdleCallback) leaked its inner timer in both copies. One copy was
 * fixed (38804ac); the other kept the leak for eleven weeks because nothing
 * tied them together. Now there is nothing to keep in step.
 *
 * The fallback's trap, so it is not reintroduced: rAF ignores its callback's
 * return value, so a cleanup returned from INSIDE the rAF callback is
 * discarded. Both ids are captured in the enclosing scope and cleared by the
 * single reaper.
 */
export function scheduleAfterFirstPaint(callback: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(callback, { timeout: DEFERRED_MOUNT_IDLE_TIMEOUT_MS });
    return () => cancelIdleCallback(id);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const raf = requestAnimationFrame(() => {
    timer = setTimeout(callback, 0);
  });
  return () => {
    cancelAnimationFrame(raf);
    if (timer !== undefined) clearTimeout(timer);
  };
}

/**
 * `false` on the server and through the first client paint; `true` once
 * `scheduleAfterFirstPaint` fires. Unmounting before it fires cancels it, so a
 * component that navigated away never sets state after unmount.
 */
export function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => scheduleAfterFirstPaint(() => setReady(true)), []);

  return ready;
}
