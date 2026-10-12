import { describe, expect, it } from 'vitest';

import { bracketSize, currentMatch, finalOrder, pick, startBracket, type Bracket } from './tournament';

const top8 = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];

function playOut(b: Bracket, choose: (a: string, c: string) => string): Bracket {
  let cur = currentMatch(b);
  while (cur) {
    b = pick(b, choose(cur.match.a, cur.match.b));
    cur = currentMatch(b);
  }
  return b;
}

describe('tournament', () => {
  it('seeds 1v8, 4v5, 2v7, 3v6 so the top two can only meet in the final', () => {
    const b = startBracket(top8)!;
    expect(b.rounds[0].map((m) => [m.a, m.b])).toEqual([['s1', 's8'], ['s4', 's5'], ['s2', 's7'], ['s3', 's6']]);
  });

  it('keeps the order when the better seed always wins', () => {
    const better = (a: string, c: string) => (top8.indexOf(a) < top8.indexOf(c) ? a : c);
    const b = playOut(startBracket(top8)!, better);
    expect(b.rounds).toHaveLength(3);
    expect(finalOrder(b)).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']);
  });

  it('crowns an upset champion and ranks the rest by round reached, then seed', () => {
    const underdog = (a: string, c: string) => (top8.indexOf(a) > top8.indexOf(c) ? a : c);
    expect(finalOrder(playOut(startBracket(top8)!, underdog))).toEqual(['s8', 's7', 's5', 's6', 's1', 's2', 's3', 's4']);
  });

  it('ignores a pick that is not in the current match', () => {
    const b = startBracket(top8)!;
    expect(pick(b, 's4')).toBe(b);
  });

  it('sizes the bracket from the ranked count', () => {
    expect([0, 1, 2, 3, 4, 7, 8, 30].map(bracketSize)).toEqual([0, 0, 2, 2, 4, 4, 8, 8]);
    expect(startBracket(['a'])).toBeNull();
    expect(finalOrder(playOut(startBracket(['a', 'b', 'c'])!, (a) => a))).toEqual(['a', 'b']);
  });
});
