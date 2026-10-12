'use client';

/**
 * React binding for the shortcut-scope stack.
 *
 * Deliberately thin, and deliberately NOT re-render-driven: `isActive()` is
 * read inside the keydown handler at event time, so a scope change never has to
 * propagate through React before the next keypress is arbitrated correctly.
 */

import { useCallback, useEffect, useId } from 'react';

import { shortcutScopes } from './shortcut-scope';

export interface ShortcutScope {
  /**
   * Whether this claimant owns the keyboard right now. Call it INSIDE the
   * handler, not in render — the answer changes when other surfaces mount.
   */
  isActive: () => boolean;
}

/**
 * Claim the keyboard for as long as this component is mounted and `enabled`.
 *
 * @param name readable label; the token appends React's per-instance id, so two
 *   mounted copies of the same component are two claims rather than one
 * @param enabled when false, no claim is made and `isActive()` returns false
 */
export function useShortcutScope(name: string, enabled = true): ShortcutScope {
  // useId rather than a module counter written through a ref: it is stable per
  // instance, unique without shared mutable state, and — unlike a ref assigned
  // during render — it does not read or write a ref in the render phase.
  const token = `${name}#${useId()}`;

  useEffect(() => {
    if (!enabled) return;
    shortcutScopes.push(token);
    // The claim names its own reaper: nothing else releases it, including a
    // crash in the surface above.
    return () => shortcutScopes.pop(token);
  }, [token, enabled]);

  const isActive = useCallback(() => {
    if (!enabled) return false;
    return shortcutScopes.isActive(token);
  }, [token, enabled]);

  return { isActive };
}
