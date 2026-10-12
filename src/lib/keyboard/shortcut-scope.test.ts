/**
 * Tests for the shortcut-scope stack.
 *
 * The scenario that matters is the one that was actually broken: the grid's
 * Ctrl+Z handler and the matchup overlay's Ctrl+Z handler both mounted, both
 * bound to window, both firing on one keypress.
 *
 * NEGATIVE CONTROL (test-harness/negative-control-tests): proved able to go red
 * on 2026-08-24 by changing `isActive`'s empty-stack arm from `return true` to
 * `return false` — a coarse mutation that silently disables every un-migrated
 * handler, which is the worst failure this module could have. Reds 2 of these
 * 15 tests. Separately, deleting the `splice` in `push` (making re-push
 * duplicate instead of promote) reds 1. Both restored.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { ShortcutScopeStack, shortcutScopes } from './shortcut-scope';

describe('ShortcutScopeStack', () => {
  let stack: ShortcutScopeStack;

  beforeEach(() => {
    stack = new ShortcutScopeStack();
  });

  it('answers true for everyone while empty', () => {
    // Load-bearing: a handler that has not adopted scopes must behave exactly
    // as it did before this module existed. Migration is one handler at a time.
    expect(stack.isActive('anything')).toBe(true);
    expect(stack.isActive('anything-else')).toBe(true);
    expect(stack.active()).toBeNull();
  });

  it('gives the keyboard to a single claimant', () => {
    stack.push('grid');
    expect(stack.isActive('grid')).toBe(true);
    expect(stack.active()).toBe('grid');
  });

  it('gives the keyboard to the MOST RECENT claimant', () => {
    // The real scenario: the grid is already mounted, the matchup overlay opens.
    stack.push('grid');
    stack.push('matchup');
    expect(stack.isActive('matchup')).toBe(true);
    expect(stack.isActive('grid')).toBe(false);
  });

  it('returns the keyboard when the overlay closes', () => {
    stack.push('grid');
    stack.push('matchup');
    stack.pop('matchup');
    expect(stack.isActive('grid')).toBe(true);
    expect(stack.active()).toBe('grid');
  });

  it('never leaves two claimants both active', () => {
    // The whole defect in one assertion.
    const tokens = ['a', 'b', 'c'];
    tokens.forEach((t) => stack.push(t));
    expect(tokens.filter((t) => stack.isActive(t))).toEqual(['c']);
  });

  it('handles three deep and unwinds correctly', () => {
    stack.push('grid');
    stack.push('bracket');
    stack.push('modal');
    expect(stack.active()).toBe('modal');
    stack.pop('modal');
    expect(stack.active()).toBe('bracket');
    stack.pop('bracket');
    expect(stack.active()).toBe('grid');
    stack.pop('grid');
    expect(stack.active()).toBeNull();
  });

  describe('robustness against React effect ordering', () => {
    it('tolerates out-of-order release', () => {
      // React does not guarantee sibling effect cleanups run in reverse setup
      // order. A strict pop would wedge the keyboard permanently.
      stack.push('grid');
      stack.push('matchup');
      stack.pop('grid');
      expect(stack.active()).toBe('matchup');
      expect(stack.isActive('matchup')).toBe(true);
      stack.pop('matchup');
      expect(stack.size()).toBe(0);
    });

    it('tolerates popping a token that was never pushed', () => {
      stack.push('grid');
      stack.pop('never-pushed');
      expect(stack.active()).toBe('grid');
      expect(stack.size()).toBe(1);
    });

    it('tolerates a double pop', () => {
      stack.push('grid');
      stack.pop('grid');
      stack.pop('grid');
      expect(stack.size()).toBe(0);
      // ...and empty means everyone works again, not nobody.
      expect(stack.isActive('grid')).toBe(true);
    });

    it('promotes rather than duplicates on re-push', () => {
      // StrictMode double-invokes effects. A duplicating push would need two
      // pops to release, so one unmount would leave a phantom claim on top and
      // the keyboard would go dead.
      stack.push('grid');
      stack.push('matchup');
      stack.push('grid');
      expect(stack.size()).toBe(2);
      expect(stack.active()).toBe('grid');
      stack.pop('grid');
      expect(stack.size()).toBe(1);
      expect(stack.active()).toBe('matchup');
    });

    it('a mount/unmount cycle leaves the stack exactly as it found it', () => {
      stack.push('grid');
      const before = stack.size();
      for (let i = 0; i < 5; i++) {
        stack.push('overlay');
        stack.pop('overlay');
      }
      expect(stack.size()).toBe(before);
      expect(stack.active()).toBe('grid');
    });
  });

  describe('clear', () => {
    it('empties the stack', () => {
      stack.push('a');
      stack.push('b');
      stack.clear();
      expect(stack.size()).toBe(0);
      expect(stack.active()).toBeNull();
    });
  });
});

describe('two instances of the same component', () => {
  // useShortcutScope builds its token as `<name>#<useId()>`, so two mounted
  // copies of one component are two distinct claims rather than one shared
  // claim. This is the property the stack has to honour for that to work.
  it('layer correctly rather than collapsing into one claim', () => {
    const stack = new ShortcutScopeStack();
    const first = 'modal#:r1:';
    const second = 'modal#:r2:';
    stack.push(first);
    stack.push(second);
    expect(stack.size()).toBe(2);
    expect(stack.isActive(second)).toBe(true);
    expect(stack.isActive(first)).toBe(false);
    stack.pop(second);
    expect(stack.isActive(first)).toBe(true);
  });

  it('closing the outer one first still leaves the inner one working', () => {
    const stack = new ShortcutScopeStack();
    stack.push('modal#:r1:');
    stack.push('modal#:r2:');
    stack.pop('modal#:r1:');
    expect(stack.isActive('modal#:r2:')).toBe(true);
  });
});

describe('the shared app stack', () => {
  it('is a singleton, because window is', () => {
    shortcutScopes.clear();
    expect(shortcutScopes.size()).toBe(0);
    shortcutScopes.push('probe');
    expect(shortcutScopes.active()).toBe('probe');
    shortcutScopes.clear();
  });
});
