/**
 * Bracket Generator - Creates tournament bracket data structures
 *
 * Handles:
 * - Generation of balanced bracket trees
 * - Bye handling for non-power-of-2 counts
 * - Round progression logic
 * - Converting bracket results to linear rankings
 */

import { BacklogItemType } from '@/types/match';

// Bracket sizes supported
export type BracketSize = 8 | 16 | 32 | 64;

// A participant in the bracket (can be a real item or a bye)
export interface BracketParticipant {
  id: string;
  item: BacklogItemType | null; // null for bye
  seed: number;
  isBye: boolean;
}

// A single matchup in the bracket
export interface BracketMatchup {
  id: string;
  roundIndex: number;
  matchIndex: number;
  participant1: BracketParticipant | null;
  participant2: BracketParticipant | null;
  winner: BracketParticipant | null;
  isComplete: boolean;
  nextMatchupId: string | null;
  position: 'top' | 'bottom'; // Which slot in next matchup
}

// A round in the tournament
export interface BracketRound {
  index: number;
  name: string;
  matchups: BracketMatchup[];
  isComplete: boolean;
}

// The full bracket state
export interface BracketState {
  id: string;
  size: BracketSize;
  rounds: BracketRound[];
  currentRoundIndex: number;
  champion: BracketParticipant | null;
  isComplete: boolean;
  createdAt: number;
  updatedAt: number;
}

// Round names based on remaining participants
const ROUND_NAMES: Record<number, string> = {
  64: 'Round of 64',
  32: 'Round of 32',
  16: 'Sweet 16',
  8: 'Quarter-finals',
  4: 'Semi-finals',
  2: 'Final',
};

/**
 * Get the nearest power of 2 >= n
 */
function nextPowerOf2(n: number): number {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Generate unique matchup ID
 */
function generateMatchupId(roundIndex: number, matchIndex: number): string {
  return `matchup-r${roundIndex}-m${matchIndex}`;
}

/**
 * Generate round name based on participants remaining
 */
function getRoundName(participantsInRound: number): string {
  return ROUND_NAMES[participantsInRound] || `Round of ${participantsInRound}`;
}

/**
 * Create a bye participant
 */
function createByeParticipant(seed: number): BracketParticipant {
  return {
    id: `bye-${seed}`,
    item: null,
    seed,
    isBye: true,
  };
}

/**
 * Create a participant from a backlog item
 */
function createParticipant(item: BacklogItemType, seed: number): BracketParticipant {
  return {
    id: item.id,
    item,
    seed,
    isBye: false,
  };
}

/**
 * Generate standard bracket seeding order
 * This creates matchups so that if higher seeds always win,
 * the 1 and 2 seeds meet in the final
 */
export function generateSeedOrder(size: BracketSize): number[] {
  if (size === 8) {
    // Base case for smallest bracket
    return [1, 8, 4, 5, 2, 7, 3, 6];
  }

  const half = size / 2;
  const lowerHalf = generateSeedOrder(half as BracketSize);

  // Pair each position with its complement
  return lowerHalf.flatMap((seed, i) => {
    const complement = size + 1 - seed;
    // Alternate which seed goes first based on position
    return i % 2 === 0 ? [seed, complement] : [complement, seed];
  });
}

/**
 * Create an empty bracket structure
 */
export function createEmptyBracket(size: BracketSize): BracketState {
  const numRounds = Math.log2(size);
  const rounds: BracketRound[] = [];

  // Generate rounds
  for (let r = 0; r < numRounds; r++) {
    const matchupsInRound = size / Math.pow(2, r + 1);
    const participantsInRound = size / Math.pow(2, r);
    const matchups: BracketMatchup[] = [];

    for (let m = 0; m < matchupsInRound; m++) {
      const matchupId = generateMatchupId(r, m);
      const nextRoundIndex = r + 1;
      const nextMatchIndex = Math.floor(m / 2);
      const nextMatchupId = nextRoundIndex < numRounds
        ? generateMatchupId(nextRoundIndex, nextMatchIndex)
        : null;

      matchups.push({
        id: matchupId,
        roundIndex: r,
        matchIndex: m,
        participant1: null,
        participant2: null,
        winner: null,
        isComplete: false,
        nextMatchupId,
        position: m % 2 === 0 ? 'top' : 'bottom',
      });
    }

    rounds.push({
      index: r,
      name: getRoundName(participantsInRound),
      matchups,
      isComplete: false,
    });
  }

  return {
    id: `bracket-${Date.now()}`,
    size,
    rounds,
    currentRoundIndex: 0,
    champion: null,
    isComplete: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Seed participants into a bracket
 */
export function seedBracket(
  bracket: BracketState,
  participants: BracketParticipant[]
): BracketState {
  const seedOrder = generateSeedOrder(bracket.size);
  const updatedBracket = { ...bracket };
  const firstRound = { ...updatedBracket.rounds[0] };

  // Create new matchups with seeded participants
  const seededMatchups = firstRound.matchups.map((matchup, idx) => {
    const seed1Index = idx * 2;
    const seed2Index = idx * 2 + 1;

    const seed1 = seedOrder[seed1Index];
    const seed2 = seedOrder[seed2Index];

    // Find participants by seed (or create bye)
    const p1 = participants.find(p => p.seed === seed1) || createByeParticipant(seed1);
    const p2 = participants.find(p => p.seed === seed2) || createByeParticipant(seed2);

    // Auto-advance byes
    let winner: BracketParticipant | null = null;
    let isComplete = false;

    if (p1.isBye && !p2.isBye) {
      winner = p2;
      isComplete = true;
    } else if (!p1.isBye && p2.isBye) {
      winner = p1;
      isComplete = true;
    } else if (p1.isBye && p2.isBye) {
      // Both byes - this shouldn't happen with proper seeding
      winner = p1;
      isComplete = true;
    }

    return {
      ...matchup,
      participant1: p1,
      participant2: p2,
      winner,
      isComplete,
    };
  });

  firstRound.matchups = seededMatchups;
  firstRound.isComplete = seededMatchups.every(m => m.isComplete);

  updatedBracket.rounds = [firstRound, ...updatedBracket.rounds.slice(1)];
  updatedBracket.updatedAt = Date.now();

  // Process any auto-advances from byes
  return processAutoAdvances(updatedBracket);
}

/**
 * Process automatic advances (from byes)
 */
function processAutoAdvances(bracket: BracketState): BracketState {
  let updated = { ...bracket };
  let hasChanges = true;

  while (hasChanges) {
    hasChanges = false;

    for (let r = 0; r < updated.rounds.length - 1; r++) {
      const currentRound = updated.rounds[r];
      const nextRound = updated.rounds[r + 1];

      for (const matchup of currentRound.matchups) {
        if (matchup.winner && matchup.nextMatchupId) {
          const nextMatchup = nextRound.matchups.find(m => m.id === matchup.nextMatchupId);

          if (nextMatchup) {
            const slot = matchup.position === 'top' ? 'participant1' : 'participant2';

            if (!nextMatchup[slot] || nextMatchup[slot]?.id !== matchup.winner.id) {
              // Update next matchup
              const updatedNextMatchup = {
                ...nextMatchup,
                [slot]: matchup.winner,
              };

              // Check for auto-advance if opponent is a bye
              const otherSlot = slot === 'participant1' ? 'participant2' : 'participant1';
              const opponent = updatedNextMatchup[otherSlot];

              if (opponent?.isBye && !matchup.winner.isBye) {
                updatedNextMatchup.winner = matchup.winner;
                updatedNextMatchup.isComplete = true;
              } else if (opponent && !opponent.isBye && matchup.winner.isBye) {
                updatedNextMatchup.winner = opponent;
                updatedNextMatchup.isComplete = true;
              }

              // Apply update
              const nextRoundMatchups = nextRound.matchups.map(m =>
                m.id === nextMatchup.id ? updatedNextMatchup : m
              );

              updated.rounds = updated.rounds.map((round, idx) =>
                idx === r + 1
                  ? { ...round, matchups: nextRoundMatchups, isComplete: nextRoundMatchups.every(m => m.isComplete) }
                  : round
              );

              hasChanges = true;
            }
          }
        }
      }
    }
  }

  // Check for champion
  const finalRound = updated.rounds[updated.rounds.length - 1];
  const finalMatchup = finalRound.matchups[0];

  if (finalMatchup.isComplete && finalMatchup.winner) {
    updated.champion = finalMatchup.winner;
    updated.isComplete = true;
  }

  // Update current round index
  updated.currentRoundIndex = updated.rounds.findIndex(r => !r.isComplete);
  if (updated.currentRoundIndex === -1) {
    updated.currentRoundIndex = updated.rounds.length - 1;
  }

  updated.updatedAt = Date.now();
  return updated;
}

/**
 * Record a matchup result
 */
export function recordMatchupResult(
  bracket: BracketState,
  matchupId: string,
  winnerId: string
): BracketState {
  let updated = { ...bracket };

  // Find and update the matchup
  for (let r = 0; r < updated.rounds.length; r++) {
    const roundMatchups = updated.rounds[r].matchups;
    const matchupIndex = roundMatchups.findIndex(m => m.id === matchupId);

    if (matchupIndex !== -1) {
      const matchup = roundMatchups[matchupIndex];
      const winner = matchup.participant1?.id === winnerId
        ? matchup.participant1
        : matchup.participant2;

      if (!winner) continue;

      const updatedMatchup = {
        ...matchup,
        winner,
        isComplete: true,
      };

      const updatedMatchups = roundMatchups.map((m, i) =>
        i === matchupIndex ? updatedMatchup : m
      );

      const isRoundComplete = updatedMatchups.every(m => m.isComplete);

      updated.rounds = updated.rounds.map((round, idx) =>
        idx === r
          ? { ...round, matchups: updatedMatchups, isComplete: isRoundComplete }
          : round
      );

      break;
    }
  }

  // Process advances to next round
  updated = processAutoAdvances(updated);

  return updated;
}

/**
 * Get the current active matchup (first incomplete in current round)
 */
export function getCurrentMatchup(bracket: BracketState): BracketMatchup | null {
  const currentRound = bracket.rounds[bracket.currentRoundIndex];
  if (!currentRound) return null;

  return currentRound.matchups.find(m => !m.isComplete) || null;
}

/**
 * Get all matchups that are ready to be played (have both participants, not complete)
 */
export function getPlayableMatchups(bracket: BracketState): BracketMatchup[] {
  const currentRound = bracket.rounds[bracket.currentRoundIndex];
  if (!currentRound) return [];

  return currentRound.matchups.filter(m =>
    !m.isComplete &&
    m.participant1 &&
    m.participant2 &&
    !m.participant1.isBye &&
    !m.participant2.isBye
  );
}

/**
 * Convert bracket results to a linear ranking
 * Champion = 1st, Runner-up = 2nd, Semi-finalists = 3rd/4th, etc.
 */
export function bracketToRanking(bracket: BracketState): BracketParticipant[] {
  if (!bracket.isComplete || !bracket.champion) {
    return [];
  }

  const ranking: BracketParticipant[] = [];

  // Process rounds in reverse order
  for (let r = bracket.rounds.length - 1; r >= 0; r--) {
    const round = bracket.rounds[r];
    const losers: BracketParticipant[] = [];

    for (const matchup of round.matchups) {
      if (matchup.isComplete && matchup.winner) {
        // The loser of this matchup gets ranked
        const loser = matchup.participant1?.id === matchup.winner.id
          ? matchup.participant2
          : matchup.participant1;

        if (loser && !loser.isBye) {
          losers.push(loser);
        }
      }
    }

    // Add losers to ranking (they're all tied at this level)
    ranking.push(...losers);
  }

  // Champion goes first
  ranking.unshift(bracket.champion);

  return ranking.filter(p => !p.isBye);
}

/**
 * Calculate bracket statistics
 */
export function getBracketStats(bracket: BracketState): {
  totalMatchups: number;
  completedMatchups: number;
  remainingMatchups: number;
  progressPercentage: number;
  currentRoundName: string;
} {
  let totalMatchups = 0;
  let completedMatchups = 0;

  for (const round of bracket.rounds) {
    for (const matchup of round.matchups) {
      // Only count matchups that aren't pure byes
      if (!matchup.participant1?.isBye || !matchup.participant2?.isBye) {
        totalMatchups++;
        if (matchup.isComplete) {
          completedMatchups++;
        }
      }
    }
  }

  const currentRound = bracket.rounds[bracket.currentRoundIndex];

  return {
    totalMatchups,
    completedMatchups,
    remainingMatchups: totalMatchups - completedMatchups,
    progressPercentage: totalMatchups > 0 ? (completedMatchups / totalMatchups) * 100 : 0,
    currentRoundName: currentRound?.name || 'Complete',
  };
}

/**
 * Determine appropriate bracket size for a given item count
 */
export function getBracketSizeForItems(itemCount: number): BracketSize {
  if (itemCount <= 8) return 8;
  if (itemCount <= 16) return 16;
  if (itemCount <= 32) return 32;
  return 64;
}
