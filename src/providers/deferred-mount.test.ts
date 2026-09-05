/**
 * scheduleAfterFirstPaint — the one idle-defer schedule for the provider shell.
 *
 * Negative control (recorded 2026-09-05, scan-sweep app-providers): the
 * `legacyFallback` fixture below is the pre-fix rAF branch verbatim from
 * MatchProviders.tsx (and DeferredProviders.tsx before 38804ac). Run through
 * the same "cancel between rAF and timeout" case it FIRES the callback after
 * cancellation — that is the leak — while `scheduleAfterFirstPaint` does not.
 * The control stays in the suite so the assertion is known to bite.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFERRED_MOUNT_IDLE_TIMEOUT_MS, scheduleAfterFirstPaint } from './deferred-mount';

type Frame = () => void;

let frames: Frame[];
let cancelledFrames: number[];
let idle: Array<{ cb: () => void; opts: unknown }>;
let cancelledIdle: number[];

function withoutIdleCallback() {
  vi.stubGlobal('requestIdleCallback', undefined);
  vi.stubGlobal('cancelIdleCallback', undefined);
}

function withIdleCallback() {
  vi.stubGlobal('requestIdleCallback', (cb: () => void, opts: unknown) => {
    idle.push({ cb, opts });
    return idle.length;
  });
  vi.stubGlobal('cancelIdleCallback', (id: number) => {
    cancelledIdle.push(id);
  });
}

/** The pre-fix shape, kept as the control. Do not "fix" it. */
function legacyFallback(callback: () => void): () => void {
  const raf = requestAnimationFrame(() => {
    const timer = setTimeout(callback, 0);
    return () => clearTimeout(timer);
  });
  return () => cancelAnimationFrame(raf);
}

beforeEach(() => {
  vi.useFakeTimers();
  frames = [];
  cancelledFrames = [];
  idle = [];
  cancelledIdle = [];
  vi.stubGlobal('requestAnimationFrame', (cb: Frame) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    cancelledFrames.push(id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('scheduleAfterFirstPaint with requestIdleCallback', () => {
  it('schedules one idle callback with the shared timeout and cancels it through the reaper', () => {
    withIdleCallback();
    const cb = vi.fn();
    const cancel = scheduleAfterFirstPaint(cb);

    expect(idle).toHaveLength(1);
    expect(idle[0].opts).toEqual({ timeout: DEFERRED_MOUNT_IDLE_TIMEOUT_MS });
    expect(frames).toHaveLength(0);

    cancel();
    expect(cancelledIdle).toEqual([1]);
    expect(cb).not.toHaveBeenCalled();
  });

  it('runs the callback when the idle period arrives', () => {
    withIdleCallback();
    const cb = vi.fn();
    scheduleAfterFirstPaint(cb);
    idle[0].cb();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe('scheduleAfterFirstPaint without requestIdleCallback (Safari / WebKit webviews)', () => {
  it('runs the callback on the frame after next', () => {
    withoutIdleCallback();
    const cb = vi.fn();
    scheduleAfterFirstPaint(cb);

    expect(frames).toHaveLength(1);
    frames[0]();
    expect(cb).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('cancelling before the frame cancels the frame', () => {
    withoutIdleCallback();
    const cb = vi.fn();
    const cancel = scheduleAfterFirstPaint(cb);
    cancel();
    expect(cancelledFrames).toEqual([1]);
    vi.runAllTimers();
    expect(cb).not.toHaveBeenCalled();
  });

  it('cancelling between the frame and its timer clears the timer (the leak)', () => {
    withoutIdleCallback();
    const cb = vi.fn();
    const cancel = scheduleAfterFirstPaint(cb);
    frames[0]();
    cancel();
    vi.runAllTimers();
    expect(cb).not.toHaveBeenCalled();
  });

  it('negative control: the pre-fix fallback fires after cancellation', () => {
    withoutIdleCallback();
    const cb = vi.fn();
    const cancel = legacyFallback(cb);
    frames[0]();
    cancel();
    vi.runAllTimers();
    // This is the defect the shared scheduler removes: a setState on an
    // unmounted provider. If this assertion ever fails, the control has been
    // "fixed" and the suite no longer proves anything.
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
