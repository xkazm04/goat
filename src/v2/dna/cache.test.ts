import { describe, expect, it } from 'vitest';

import { readPersona, readRecs, RECS_TTL_MS, writePersona, writeRecs } from './cache';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

const persona = { name: 'The Night Archivist', tagline: 't', evidence: ['a', 'b', 'c'] };

describe('taste cache', () => {
  it('round-trips a persona and rejects a corrupt one', () => {
    const store = memory();
    expect(readPersona(store)).toBeNull();
    writePersona(store, { fingerprint: 'f', cardNo: 3, persona });
    expect(readPersona(store)).toEqual({ fingerprint: 'f', cardNo: 3, persona });
    store.setItem('goat-v2:persona', '{"fingerprint": 1}');
    expect(readPersona(store)).toBeNull();
    store.setItem('goat-v2:persona', 'not json');
    expect(readPersona(store)).toBeNull();
  });

  it('reuses recommendations for the same taste within 24 hours only', () => {
    const store = memory();
    const at = 1_000_000;
    writeRecs(store, { fingerprint: 'f', at, items: [{ id: 1 }] });
    expect(readRecs(store, 'f', at + RECS_TTL_MS - 1)).toEqual([{ id: 1 }]);
    expect(readRecs(store, 'f', at + RECS_TTL_MS)).toBeNull();
    expect(readRecs(store, 'other', at)).toBeNull();
  });

  it('survives a storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readPersona(broken)).toBeNull();
    expect(() => writePersona(broken, { fingerprint: 'f', cardNo: 1, persona })).not.toThrow();
  });
});
