import type { ItemId } from './types';

/**
 * Stage's tournament: single elimination over the current top 8 (or 4, or 2),
 * seeded so #1 and #2 can only meet in the final. Every match is a face-off the
 * user decides. The result re-orders the top of the list.
 */
export interface Match {
  a: ItemId;
  b: ItemId;
  winner: ItemId | null;
}

export interface Bracket {
  seeds: ItemId[];
  rounds: Match[][];
}

/** First-round pairs by seed index, top half then bottom half. */
const PAIRS: Record<number, [number, number][]> = {
  8: [[0, 7], [3, 4], [1, 6], [2, 5]],
  4: [[0, 3], [1, 2]],
  2: [[0, 1]],
};

export function bracketSize(ranked: number): 8 | 4 | 2 | 0 {
  return ranked >= 8 ? 8 : ranked >= 4 ? 4 : ranked >= 2 ? 2 : 0;
}

export function startBracket(order: ItemId[]): Bracket | null {
  const size = bracketSize(order.length);
  if (!size) return null;
  const seeds = order.slice(0, size);
  return { seeds, rounds: [PAIRS[size].map(([a, b]) => ({ a: seeds[a], b: seeds[b], winner: null }))] };
}

/** The next undecided match, or null when the champion is known. */
export function currentMatch(b: Bracket): { round: number; index: number; match: Match } | null {
  const round = b.rounds.length - 1;
  const index = b.rounds[round].findIndex((m) => m.winner === null);
  return index < 0 ? null : { round, index, match: b.rounds[round][index] };
}

/** Record the winner of the current match; open the next round when this one is done. */
export function pick(b: Bracket, winner: ItemId): Bracket {
  const cur = currentMatch(b);
  if (!cur || (winner !== cur.match.a && winner !== cur.match.b)) return b;
  const rounds = b.rounds.map((r) => r.map((m) => ({ ...m })));
  rounds[cur.round][cur.index].winner = winner;
  const done = rounds[cur.round];
  if (done.every((m) => m.winner) && done.length > 1) {
    const next: Match[] = [];
    for (let i = 0; i < done.length; i += 2) next.push({ a: done[i].winner!, b: done[i + 1].winner!, winner: null });
    rounds.push(next);
  }
  return { ...b, rounds };
}

/**
 * The finished ranking of the seeds: champion, runner-up, then each earlier
 * round's losers, better seed first within a round.
 */
export function finalOrder(b: Bracket): ItemId[] | null {
  if (currentMatch(b)) return null;
  const seedOf = (id: ItemId) => b.seeds.indexOf(id);
  const final = b.rounds[b.rounds.length - 1][0];
  const loser = (m: Match) => (m.winner === m.a ? m.b : m.a);
  const out = [final.winner!, loser(final)];
  for (let r = b.rounds.length - 2; r >= 0; r--) {
    out.push(...b.rounds[r].map(loser).sort((x, y) => seedOf(x) - seedOf(y)));
  }
  return out;
}
