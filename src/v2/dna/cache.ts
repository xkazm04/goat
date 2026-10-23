/**
 * Per-browser memory of the last persona and recommendations, so reopening
 * the profile does not call the model again while the taste has not changed.
 * Recommendations are reused for 24 hours (docs/v2/TECHNICAL_PACKAGE.md §4).
 */

export const RECS_TTL_MS = 24 * 60 * 60 * 1000;

type KeyValue = Pick<Storage, 'getItem' | 'setItem'>;

export interface CachedPersona {
  fingerprint: string;
  cardNo: number;
  persona: { name: string; tagline: string; evidence: string[] };
}

export interface CachedRecs<T> {
  fingerprint: string;
  at: number;
  items: T[];
}

const PERSONA_KEY = 'goat-v2:persona';
const RECS_KEY = 'goat-v2:recs';

function read(store: KeyValue, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(store: KeyValue, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or quota: the profile just regenerates next time.
  }
}

export function readPersona(store: KeyValue): CachedPersona | null {
  const v = read(store, PERSONA_KEY) as Partial<CachedPersona> | null;
  const p = v?.persona;
  const ok = v && typeof v.fingerprint === 'string' && typeof v.cardNo === 'number' && p && typeof p.name === 'string' && Array.isArray(p.evidence);
  return ok ? (v as CachedPersona) : null;
}

export function writePersona(store: KeyValue, value: CachedPersona): void {
  write(store, PERSONA_KEY, value);
}

/** The cached list when it is for this taste and still fresh, otherwise null. */
export function readRecs<T>(store: KeyValue, fingerprint: string, now: number): T[] | null {
  const v = read(store, RECS_KEY) as Partial<CachedRecs<T>> | null;
  if (!v || v.fingerprint !== fingerprint || typeof v.at !== 'number' || !Array.isArray(v.items)) return null;
  return now - v.at < RECS_TTL_MS ? v.items : null;
}

export function writeRecs<T>(store: KeyValue, value: CachedRecs<T>): void {
  write(store, RECS_KEY, value);
}
