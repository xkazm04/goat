/**
 * Shortcut scopes — deciding WHICH window-level key handler owns a keypress.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * Several surfaces in this app bind `keydown` on `window`. Window listeners do
 * not nest: when two are registered, both run, in registration order, and both
 * think they are the only one. Concretely, before 2026-08-24:
 *
 *   SimpleMatchGrid mounts useUndoKeyboard (Ctrl+Z -> the undo-store command
 *   stack) and ALSO renders BracketView, which renders MatchupScreen, which
 *   mounts useMatchupKeyboard (Ctrl+Z -> reverse the last matchup pick).
 *
 * One Ctrl+Z press therefore fired BOTH: the user un-picked a matchup and
 * un-did a grid operation, from a single keystroke, with no way to tell.
 *
 * WHY NOT MERGE THE TWO HANDLERS
 * ------------------------------
 * They look alike and change for different reasons — one drives a command
 * stack, the other reverses a bracket vote. Merging them would produce a hook
 * with a mode flag, then another, until it encoded the union of two jobs and
 * belonged to neither. Duplication is cheaper than the wrong abstraction; the
 * shared thing here is not the handler, it is the QUESTION "am I the one who
 * should act". So this module is a mechanism, not a boundary move
 * (registry module-design/locality-and-leverage).
 *
 * THE MODEL
 * ---------
 * A LIFO stack of claims. The most recently pushed scope is active; everything
 * beneath it stands down. That matches how these surfaces actually layer —
 * an overlay opens over the grid, takes the keyboard, gives it back on close —
 * and it needs no coordination between the handlers themselves.
 *
 * The stack is deliberately a plain data structure with no React and no DOM in
 * it, so the layering rules can be tested directly. See ./shortcut-scope.test.ts.
 */

export class ShortcutScopeStack {
  private stack: string[] = [];

  /**
   * Claim the keyboard. The token must be unique per claimant instance — two
   * mounted copies of the same component are two claims, not one.
   * Re-pushing a token already on the stack MOVES it to the top rather than
   * duplicating it, so a double-push cannot require a double-pop.
   */
  push(token: string): void {
    const existing = this.stack.indexOf(token);
    if (existing !== -1) this.stack.splice(existing, 1);
    this.stack.push(token);
  }

  /**
   * Release a claim. Tolerant of a token that is not on the stack and of
   * out-of-order release: React does not guarantee that sibling effect
   * cleanups run in the reverse of their setup order, and a strict pop would
   * turn that into a permanently wedged keyboard.
   */
  pop(token: string): void {
    const index = this.stack.indexOf(token);
    if (index !== -1) this.stack.splice(index, 1);
  }

  /** The claimant that should handle the next keypress, or null if none. */
  active(): string | null {
    return this.stack.length === 0 ? null : this.stack[this.stack.length - 1];
  }

  /**
   * Whether this token owns the keyboard right now.
   *
   * An EMPTY stack answers true for everyone. That is deliberate: a handler
   * that never claimed a scope must keep working exactly as it did before this
   * module existed, so adopting scopes one handler at a time cannot silently
   * disable an un-migrated one.
   */
  isActive(token: string): boolean {
    if (this.stack.length === 0) return true;
    return this.active() === token;
  }

  /** How many claims are outstanding. Test/diagnostic use. */
  size(): number {
    return this.stack.length;
  }

  /** Test-only reset. */
  clear(): void {
    this.stack = [];
  }
}

/**
 * The app's single stack. Module-scoped on purpose: window is a singleton, so
 * the thing arbitrating window listeners must be one too.
 */
export const shortcutScopes = new ShortcutScopeStack();

/**
 * Token convention: `<name>#<instance>`. The hook builds it from React's
 * useId, so two mounted copies of the same component are two claims rather
 * than one, without this module owning a mutable counter.
 */
