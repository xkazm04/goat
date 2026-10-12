import { describe, expect, it } from 'vitest';

import { demoDoc } from './fixtures';
import { commit, redo, startHistory, undo } from './history';

describe('history', () => {
  it('undoes and redoes a command', () => {
    const start = startHistory(demoDoc());
    const moved = commit(start, { type: 'place', id: 'hk', at: 0 });
    expect(moved.present.order[0]).toBe('hk');

    const back = undo(moved);
    expect(back.present).toBe(start.present);
    expect(redo(back).present).toBe(moved.present);
  });

  it('skips no-op commands so undo never steps through nothing', () => {
    const start = startHistory(demoDoc());
    expect(commit(start, { type: 'place', id: start.present.order[0], at: 0 })).toBe(start);
  });

  it('clears redo after a new command', () => {
    const h = undo(commit(startHistory(demoDoc()), { type: 'unrank', id: 'er' }));
    expect(h.future).toHaveLength(1);
    expect(commit(h, { type: 'setTitle', title: 'Mine' }).future).toEqual([]);
  });

  it('keeps at most 100 steps', () => {
    let h = startHistory(demoDoc());
    for (let i = 0; i < 130; i++) h = commit(h, { type: 'setTitle', title: `Title ${i}` });
    expect(h.past).toHaveLength(100);
  });

  it('does nothing past either end', () => {
    const h = startHistory(demoDoc());
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });
});
