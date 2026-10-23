import { describe, expect, it } from 'vitest';

import { DEMO_ITEMS, demoDoc } from '@/v2/list/fixtures';
import { apply } from '@/v2/list/reducer';

import { buildCriticMessages, CRITIC_SYSTEM, encodeCriticEvent, parseCriticLine } from './critic';
import { newGaps } from './gaps';
import { describeChange, renderSnapshot, snapshotOf, type ListSnapshot } from './snapshot';


const items = Object.fromEntries(DEMO_ITEMS.map((i) => [i.id, i]));

describe('snapshot and diff', () => {
  const doc = demoDoc();
  const snap = snapshotOf(doc, items);

  it('renders the same bytes for the same list', () => {
    expect(renderSnapshot(snap)).toBe(renderSnapshot(snapshotOf(doc, items)));
    expect(renderSnapshot(snap)).toMatch(/^List: .*\nTopic: /);
  });

  it('describes moves, additions and removals, and nothing when nothing changed', () => {
    expect(describeChange(snap, snap)).toBeNull();
    const first = doc.order[0];
    const moved = apply(doc, { type: 'place', id: first, at: 3 });
    expect(describeChange(snap, snapshotOf(moved, items))).toContain(`${items[first].title} moved from #1 to #4.`);

    const poolId = doc.pool[0];
    const ranked = apply(doc, { type: 'place', id: poolId, at: 0 });
    expect(describeChange(snap, snapshotOf(ranked, items))).toContain(`${items[poolId].title} was ranked at #1.`);

    const removed = apply(doc, { type: 'unrank', id: first });
    expect(describeChange(snap, snapshotOf(removed, items))).toContain('was removed from the ranking (was #1)');
  });

  it('reports items that join the pool', () => {
    const extra = { ...items[demoDoc().pool[0]], id: 'new-1', title: 'Brand New' };
    const next = apply(doc, { type: 'addToPool', ids: ['new-1'] });
    const text = describeChange(snap, snapshotOf(next, { ...items, 'new-1': extra }));
    expect(text).toBe('Added to the pool: Brand New.');
  });
});

describe('critic messages', () => {
  const snap = snapshotOf(demoDoc(), items);

  it('puts the cached snapshot first and attaches edits after the next user turn', () => {
    const msgs = buildCriticMessages(snap, [
      { kind: 'user', text: 'Defend my #1.' },
      { kind: 'assistant', text: 'Why that one?' },
      { kind: 'change', text: 'X moved from #1 to #4.' },
      { kind: 'change', text: 'Y was ranked at #2.' },
      { kind: 'user', text: 'Fine, what now?' },
    ]);
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'system']);
    const first = msgs[0].content as { cache_control?: unknown; text: string }[];
    expect(first[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(first[0].text).toBe(renderSnapshot(snap));
    expect(msgs[3].content).toContain('X moved from #1 to #4.\nY was ranked at #2.');
  });

  it('keeps earlier messages byte-identical as the conversation grows (the cache prefix)', () => {
    const turns = [
      { kind: 'user' as const, text: 'Q1' },
      { kind: 'assistant' as const, text: 'A1' },
      { kind: 'change' as const, text: 'c' },
      { kind: 'user' as const, text: 'Q2' },
    ];
    const short = buildCriticMessages(snap, turns.slice(0, 2));
    const long = buildCriticMessages(snap, [...turns, { kind: 'assistant', text: 'A2' }, { kind: 'user', text: 'Q3' }]);
    expect(JSON.stringify(long.slice(0, short.length))).toBe(JSON.stringify(short));
  });

  it('drops edits that precede the first question and unanswered trailing edits', () => {
    const msgs = buildCriticMessages(snap, [
      { kind: 'change', text: 'before' },
      { kind: 'user', text: 'Q1' },
      { kind: 'assistant', text: 'A1' },
      { kind: 'change', text: 'after' },
    ]);
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('has a system prompt with no per-list or per-time values', () => {
    expect(CRITIC_SYSTEM).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('round-trips events', () => {
    expect(parseCriticLine(encodeCriticEvent({ type: 'delta', text: 'hi' }))).toEqual({ type: 'delta', text: 'hi' });
    expect(parseCriticLine('{bad')).toBeNull();
  });
});

describe('gaps', () => {
  const snap: ListSnapshot = {
    title: 't',
    topic: 'x',
    size: 10,
    ranked: [{ id: 'a', title: 'Blade Runner', year: 1982, creator: null, note: '' }],
    pool: [{ id: 'b', title: 'Alien' }],
  };
  const c = (title: string, year = 1990) => ({
    title,
    year,
    creator: null,
    why: 'w',
    traits: ['t'],
    art: { hues: [1, 100] as [number, number], motif: 'sun' as const },
  });

  it('removes suggestions already listed or repeated and caps at five', () => {
    const out = newGaps([c('BLADE RUNNER!'), c('alien'), c('Dune'), c('Dune'), c('A'), c('B'), c('C'), c('D'), c('E')], snap);
    expect(out.map((o) => o.title)).toEqual(['Dune', 'A', 'B', 'C', 'D']);
  });
});

describe('tagging batches', () => {
  it('builds one cached-system request per item, keyed by item id', async () => {
    const { buildTagRequests } = await import('./tagging');
    const reqs = buildTagRequests('Sci-fi', [
      { id: 'a', title: 'Alien', year: 1979, creator: 'Ridley Scott' },
      { id: 'b', title: 'Dune', year: null, creator: null },
    ]);
    expect(reqs.map((r) => r.custom_id)).toEqual(['a', 'b']);
    expect(reqs[0].params.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(reqs[0].params.messages[0].content).toBe('Topic: Sci-fi\nItem: Alien (1979) by Ridley Scott');
    expect(reqs[1].params.messages[0].content).toBe('Topic: Sci-fi\nItem: Dune');
  });

  it('keys results by custom_id in any order and skips errors and malformed rows', async () => {
    const { parseTagResults } = await import('./tagging');
    const ok = (id: string, text: string) => ({
      custom_id: id,
      result: { type: 'succeeded', message: { content: [{ type: 'thinking' }, { type: 'text', text }] } },
    });
    const out = parseTagResults([
      ok('b', '{"traits":["epic"]}'),
      { custom_id: 'x', result: { type: 'errored' } },
      ok('c', 'not json'),
      ok('a', '{"traits":["horror","space","classic","extra"]}'),
      ok('d', '{"traits":["fine"]}'),
    ]);
    expect(out).toEqual({ b: ['epic'], d: ['fine'] });
  });
});

describe('persona schema', () => {
  it('clips over-long text at a word and keeps the first three evidence lines', async () => {
    const { personaSchema } = await import('./taste');
    const long = `${'word '.repeat(60)}end`;
    const parsed = personaSchema.parse({ name: 'N', tagline: long, evidence: ['a', 'b', 'c', 'd'] });
    expect(parsed.tagline.length).toBeLessThanOrEqual(140);
    expect(parsed.tagline.endsWith('…')).toBe(true);
    expect(parsed.evidence).toEqual(['a', 'b', 'c']);
    expect(personaSchema.safeParse({ name: 'N', tagline: 't', evidence: ['a', 'b'] }).success).toBe(false);
  });
});
