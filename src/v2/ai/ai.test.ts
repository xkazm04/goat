import { describe, expect, it } from 'vitest';

import { isConsistent } from '@/v2/list/reducer';

import { candidateId, candidateSchema, docFromCandidates, type Candidate } from './candidate';
import { createLineSplitter, encodeEvent, parseEventLine } from './events';
import { fixtureProvider, POOL_SYSTEM } from './pool';
import { DAILY_LIMITS, isOverQuota, quotaWindowStart } from './quota';


const sample: Candidate = {
  title: 'Blade Runner',
  year: 1982,
  creator: 'Ridley Scott',
  why: 'Defined the look of future noir.',
  traits: ['neo-noir', 'dystopian'],
  art: { hues: [200, 20], motif: 'moon' },
};

describe('candidate', () => {
  it('accepts a well-formed candidate and rejects a malformed one', () => {
    expect(candidateSchema.safeParse(sample).success).toBe(true);
    expect(candidateSchema.safeParse({ ...sample, traits: [] }).success).toBe(false);
    expect(candidateSchema.safeParse({ ...sample, art: { hues: [400, 20], motif: 'moon' } }).success).toBe(false);
    expect(candidateSchema.safeParse({ ...sample, art: { hues: [1, 2], motif: 'nope' } }).success).toBe(false);
  });

  it('derives a stable id from title and year', () => {
    expect(candidateId(sample)).toBe('c-blade-runner-1982');
    expect(candidateId({ title: 'Café Müller!', year: null })).toBe('c-cafe-muller');
  });

  it('builds a consistent doc with every candidate in the pool and none ranked', () => {
    const { doc, items, why } = docFromCandidates({
      id: 'x',
      topic: ' sci-fi films ',
      size: 10,
      candidates: [sample, sample, { ...sample, title: 'Alien', year: 1979 }],
    });
    expect(items.map((i) => i.id)).toEqual(['c-blade-runner-1982', 'c-alien-1979']);
    expect(doc.pool).toEqual(items.map((i) => i.id));
    expect(doc.order).toEqual([]);
    expect(doc.title).toBe('The Greatest sci-fi films');
    expect(why['c-alien-1979']).toBe(sample.why);
    expect(isConsistent(doc)).toBe(true);
  });
});

describe('ndjson events', () => {
  it('round-trips events and drops blank, malformed and schema-failing lines', () => {
    const line = encodeEvent({ type: 'candidate', candidate: sample });
    expect(parseEventLine(line)).toEqual({ type: 'candidate', candidate: sample });
    expect(parseEventLine('')).toBeNull();
    expect(parseEventLine('{nope')).toBeNull();
    expect(parseEventLine(JSON.stringify({ type: 'candidate', candidate: { title: 'x' } }))).toBeNull();
    expect(parseEventLine(JSON.stringify({ type: 'done', count: 3, source: 'fixture' }))).toEqual({
      type: 'done',
      count: 3,
      source: 'fixture',
    });
  });

  it('reassembles lines split across chunks', () => {
    const split = createLineSplitter();
    expect(split.push('{"a":1}\n{"b"')).toEqual(['{"a":1}']);
    expect(split.push(':2}\n{"c":3}')).toEqual(['{"b":2}']);
    expect(split.flush()).toEqual(['{"c":3}']);
    expect(split.flush()).toEqual([]);
  });
});

describe('providers and quota', () => {
  it('the fixture provider yields the requested count of valid, distinct candidates', async () => {
    const out: Candidate[] = [];
    for await (const step of fixtureProvider().run({ topic: 'pizza', count: 12 })) {
      if (step.type === 'candidate') out.push(step.candidate);
    }
    expect(out).toHaveLength(12);
    expect(out.every((c) => candidateSchema.safeParse(c).success)).toBe(true);
    expect(new Set(out.map((c) => candidateId(c))).size).toBe(12);
  });

  it('keeps the system prompt free of per-request values so it caches', () => {
    expect(POOL_SYSTEM).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(POOL_SYSTEM).not.toMatch(/\$\{|undefined/);
  });

  it('limits a task once its daily allowance is used', () => {
    expect(isOverQuota('pool', DAILY_LIMITS.pool - 1)).toBe(false);
    expect(isOverQuota('pool', DAILY_LIMITS.pool)).toBe(true);
    expect(quotaWindowStart(new Date('2026-10-12T12:00:00.000Z'))).toBe('2026-10-11T12:00:00.000Z');
  });
});
