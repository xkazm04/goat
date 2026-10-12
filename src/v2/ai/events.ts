import { candidateSchema, type Candidate } from './candidate';

/** What `/api/v2/pool` streams, one JSON object per line. */
export type PoolEvent =
  | { type: 'candidate'; id: string; candidate: Candidate }
  | { type: 'done'; count: number; source: 'claude' | 'fixture' }
  | { type: 'error'; code: 'quota' | 'auth' | 'refused' | 'failed' | 'bad_request'; message: string };

export function encodeEvent(event: PoolEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/** Parse one NDJSON line. Returns null for blank or malformed lines and for candidates that fail the schema. */
export function parseEventLine(line: string): PoolEvent | null {
  const text = line.trim();
  if (!text) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as { type?: unknown };
  if (e.type === 'candidate') {
    const parsed = candidateSchema.safeParse((raw as { candidate?: unknown }).candidate);
    const id = (raw as { id?: unknown }).id;
    return parsed.success && typeof id === 'string' ? { type: 'candidate', id, candidate: parsed.data } : null;
  }
  if (e.type === 'done' || e.type === 'error') return raw as PoolEvent;
  return null;
}

/** Split a chunked text stream into lines, carrying the partial tail between chunks. */
export function createLineSplitter(): { push(chunk: string): string[]; flush(): string[] } {
  let tail = '';
  return {
    push(chunk) {
      const parts = (tail + chunk).split('\n');
      tail = parts.pop() ?? '';
      return parts;
    },
    flush() {
      const rest = tail;
      tail = '';
      return rest.trim() ? [rest] : [];
    },
  };
}
