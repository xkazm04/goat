import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEMO_ITEMS, demoDoc } from './fixtures';
import { startHistory } from './history';
import { autosave, memoryStorage, readSaved } from './storage';
import { createEditorStore } from './store';

afterEach(() => vi.useRealTimers());

describe('autosave', () => {
  it('saves after edits settle, and a reload restores both the list and its undo', async () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const store = createEditorStore({ doc: demoDoc(), items: DEMO_ITEMS });
    const stop = autosave(store, storage, 400);

    store.getState().dispatch({ type: 'place', id: 'hk', at: 0 });
    store.getState().dispatch({ type: 'unrank', id: 'er' });
    expect(await storage.load('demo')).toBeNull();

    await vi.advanceTimersByTimeAsync(400);
    stop();

    // "Reload": a fresh store from what was saved.
    const saved = await storage.load('demo');
    expect(saved).not.toBeNull();
    const reloaded = createEditorStore({ history: saved!.history, items: saved!.items });
    expect(reloaded.getState().history.present.order[0]).toBe('hk');

    reloaded.getState().undo();
    expect(reloaded.getState().history.present.order).toContain('er');
  });

  it('flushes a pending save when stopped', async () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const store = createEditorStore({ doc: demoDoc(), items: DEMO_ITEMS });
    const stop = autosave(store, storage, 10_000);
    store.getState().dispatch({ type: 'setTitle', title: 'Mine' });
    stop();
    await vi.runAllTimersAsync();
    expect((await storage.load('demo'))?.history.present.title).toBe('Mine');
  });
});

describe('readSaved', () => {
  it('rejects wrong versions and inconsistent documents', () => {
    const history = startHistory(demoDoc());
    const ok = { version: 1, history, items: DEMO_ITEMS, savedAt: '' };
    expect(readSaved(ok)).not.toBeNull();
    expect(readSaved({ ...ok, version: 2 })).toBeNull();
    expect(readSaved(null)).toBeNull();
    const broken = { ...history.present, pool: [...history.present.pool, history.present.order[0]] };
    expect(readSaved({ ...ok, history: { ...history, present: broken } })).toBeNull();
  });
});
