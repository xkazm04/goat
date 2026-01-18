/**
 * Unified Ranking Engine Implementation
 *
 * Provides a single abstraction for position-assignment that can be visualized
 * as grids, tiers, or brackets. This is the core engine that all ranking
 * systems should use.
 */

import {
  RankableItem,
  RankedItem,
  PositionAssignment,
  Ranking,
  RankingOperation,
  OperationResult,
  RankingEngine as IRankingEngine,
  GridVisualization,
  TierVisualization,
  BracketVisualization,
  ListVisualization,
  GridRankingView,
  TieredRankingView,
  BracketRankingView,
  ListRankingView,
  TierMapping,
  MatchupResult,
} from './types';

// =============================================================================
// Default Configurations
// =============================================================================

const DEFAULT_GRID_CONFIG: GridVisualization = {
  type: 'grid',
  columns: 5,
  showPositionNumbers: true,
  showEmptySlots: true,
  highlightPodium: true,
};

const DEFAULT_TIER_CONFIG: TierVisualization = {
  type: 'tiers',
  tierCount: 5,
  tierLabels: ['S', 'A', 'B', 'C', 'D'],
  tierColors: ['#ff7f7f', '#ffbf7f', '#ffff7f', '#7fff7f', '#7fbfff'],
  showBoundaries: true,
  algorithm: 'pyramid',
};

const DEFAULT_BRACKET_CONFIG: BracketVisualization = {
  type: 'bracket',
  bracketSize: 16,
  showSeeds: true,
  showRoundNames: true,
};

const DEFAULT_LIST_CONFIG: ListVisualization = {
  type: 'list',
  showRankNumbers: true,
  compact: false,
};

// =============================================================================
// Core Implementation
// =============================================================================

export class RankingEngineImpl implements IRankingEngine {
  private ranking: Ranking;
  private items: Map<string, RankableItem>;
  private undoStack: PositionAssignment[][] = [];
  private redoStack: PositionAssignment[][] = [];
  private maxHistorySize = 50;

  constructor(
    listId: string,
    size: number,
    initialItems?: RankableItem[]
  ) {
    this.ranking = {
      id: `ranking-${Date.now()}`,
      listId,
      size,
      assignments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.items = new Map();
    if (initialItems) {
      initialItems.forEach(item => this.items.set(item.id, item));
    }
  }

  // ---------------------------------------------------------------------------
  // Core State
  // ---------------------------------------------------------------------------

  getRanking(): Ranking {
    return { ...this.ranking };
  }

  getItems(): RankedItem[] {
    return this.ranking.assignments
      .sort((a, b) => a.position - b.position)
      .map(assignment => this.assignmentToRankedItem(assignment))
      .filter((item): item is RankedItem => item !== null);
  }

  getItemAtPosition(position: number): RankedItem | null {
    const assignment = this.ranking.assignments.find(a => a.position === position);
    if (!assignment) return null;
    return this.assignmentToRankedItem(assignment);
  }

  getPositionForItem(itemId: string): number | null {
    const assignment = this.ranking.assignments.find(a => a.itemId === itemId);
    return assignment?.position ?? null;
  }

  // ---------------------------------------------------------------------------
  // Item Management
  // ---------------------------------------------------------------------------

  registerItem(item: RankableItem): void {
    this.items.set(item.id, item);
  }

  registerItems(items: RankableItem[]): void {
    items.forEach(item => this.items.set(item.id, item));
  }

  getRegisteredItem(itemId: string): RankableItem | undefined {
    return this.items.get(itemId);
  }

  // ---------------------------------------------------------------------------
  // Operations
  // ---------------------------------------------------------------------------

  assign(itemId: string, position: number): OperationResult {
    const operation: RankingOperation = { type: 'assign', itemId, position };

    // Validate position
    if (position < 0 || position >= this.ranking.size) {
      return {
        success: false,
        operation,
        newState: this.ranking.assignments,
        error: `Invalid position: ${position}`,
      };
    }

    // Check if position is already occupied
    const existingAtPosition = this.ranking.assignments.find(a => a.position === position);
    if (existingAtPosition) {
      return {
        success: false,
        operation,
        newState: this.ranking.assignments,
        error: `Position ${position} is already occupied`,
      };
    }

    // Check if item is already assigned
    const existingItem = this.ranking.assignments.find(a => a.itemId === itemId);
    if (existingItem) {
      return {
        success: false,
        operation,
        newState: this.ranking.assignments,
        error: `Item ${itemId} is already assigned at position ${existingItem.position}`,
      };
    }

    // Save state for undo
    this.pushUndo();

    // Create assignment
    const assignment: PositionAssignment = {
      itemId,
      position,
      timestamp: Date.now(),
      source: 'direct',
    };

    this.ranking.assignments.push(assignment);
    this.ranking.updatedAt = Date.now();

    return {
      success: true,
      operation,
      previousState: this.undoStack[this.undoStack.length - 1],
      newState: [...this.ranking.assignments],
    };
  }

  move(fromPosition: number, toPosition: number): OperationResult {
    const operation: RankingOperation = { type: 'move', fromPosition, toPosition };

    // Validate positions
    if (fromPosition < 0 || fromPosition >= this.ranking.size ||
        toPosition < 0 || toPosition >= this.ranking.size) {
      return {
        success: false,
        operation,
        newState: this.ranking.assignments,
        error: 'Invalid position',
      };
    }

    // Find item at source position
    const sourceIndex = this.ranking.assignments.findIndex(a => a.position === fromPosition);
    if (sourceIndex === -1) {
      return {
        success: false,
        operation,
        newState: this.ranking.assignments,
        error: `No item at position ${fromPosition}`,
      };
    }

    // Check if target is occupied
    const targetIndex = this.ranking.assignments.findIndex(a => a.position === toPosition);
    if (targetIndex !== -1) {
      // Target occupied - this should be a swap instead
      return this.swap(fromPosition, toPosition);
    }

    // Save state for undo
    this.pushUndo();

    // Move the item
    this.ranking.assignments[sourceIndex] = {
      ...this.ranking.assignments[sourceIndex],
      position: toPosition,
      timestamp: Date.now(),
    };
    this.ranking.updatedAt = Date.now();

    return {
      success: true,
      operation,
      previousState: this.undoStack[this.undoStack.length - 1],
      newState: [...this.ranking.assignments],
    };
  }

  swap(positionA: number, positionB: number): OperationResult {
    const operation: RankingOperation = { type: 'swap', positionA, positionB };

    // Validate positions
    if (positionA < 0 || positionA >= this.ranking.size ||
        positionB < 0 || positionB >= this.ranking.size) {
      return {
        success: false,
        operation,
        newState: this.ranking.assignments,
        error: 'Invalid position',
      };
    }

    // Find items at both positions
    const indexA = this.ranking.assignments.findIndex(a => a.position === positionA);
    const indexB = this.ranking.assignments.findIndex(a => a.position === positionB);

    // At least one must be occupied
    if (indexA === -1 && indexB === -1) {
      return {
        success: false,
        operation,
        newState: this.ranking.assignments,
        error: 'Both positions are empty',
      };
    }

    // Save state for undo
    this.pushUndo();

    // Perform swap
    if (indexA !== -1) {
      this.ranking.assignments[indexA] = {
        ...this.ranking.assignments[indexA],
        position: positionB,
        timestamp: Date.now(),
      };
    }
    if (indexB !== -1) {
      this.ranking.assignments[indexB] = {
        ...this.ranking.assignments[indexB],
        position: positionA,
        timestamp: Date.now(),
      };
    }
    this.ranking.updatedAt = Date.now();

    return {
      success: true,
      operation,
      previousState: this.undoStack[this.undoStack.length - 1],
      newState: [...this.ranking.assignments],
    };
  }

  remove(position: number): OperationResult {
    const operation: RankingOperation = { type: 'remove', position };

    const index = this.ranking.assignments.findIndex(a => a.position === position);
    if (index === -1) {
      return {
        success: false,
        operation,
        newState: this.ranking.assignments,
        error: `No item at position ${position}`,
      };
    }

    // Save state for undo
    this.pushUndo();

    // Remove the assignment
    this.ranking.assignments.splice(index, 1);
    this.ranking.updatedAt = Date.now();

    return {
      success: true,
      operation,
      previousState: this.undoStack[this.undoStack.length - 1],
      newState: [...this.ranking.assignments],
    };
  }

  clear(): OperationResult {
    const operation: RankingOperation = { type: 'clear' };

    // Save state for undo
    this.pushUndo();

    this.ranking.assignments = [];
    this.ranking.updatedAt = Date.now();

    return {
      success: true,
      operation,
      previousState: this.undoStack[this.undoStack.length - 1],
      newState: [],
    };
  }

  batch(operations: RankingOperation[]): OperationResult {
    const batchOp: RankingOperation = { type: 'batch', operations };

    // Save state for undo (single undo point for entire batch)
    this.pushUndo();

    for (const op of operations) {
      let result: OperationResult;

      switch (op.type) {
        case 'assign':
          result = this.executeWithoutUndo(() => this.assign(op.itemId, op.position));
          break;
        case 'move':
          result = this.executeWithoutUndo(() => this.move(op.fromPosition, op.toPosition));
          break;
        case 'swap':
          result = this.executeWithoutUndo(() => this.swap(op.positionA, op.positionB));
          break;
        case 'remove':
          result = this.executeWithoutUndo(() => this.remove(op.position));
          break;
        case 'clear':
          result = this.executeWithoutUndo(() => this.clear());
          break;
        case 'batch':
          result = this.executeWithoutUndo(() => this.batch(op.operations));
          break;
        default:
          continue;
      }

      if (!result.success) {
        // Rollback
        this.ranking.assignments = this.undoStack.pop() || [];
        return {
          success: false,
          operation: batchOp,
          newState: this.ranking.assignments,
          error: result.error,
        };
      }
    }

    return {
      success: true,
      operation: batchOp,
      previousState: this.undoStack[this.undoStack.length - 1],
      newState: [...this.ranking.assignments],
    };
  }

  // ---------------------------------------------------------------------------
  // Undo/Redo
  // ---------------------------------------------------------------------------

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): OperationResult | null {
    if (!this.canUndo()) return null;

    const currentState = [...this.ranking.assignments];
    const previousState = this.undoStack.pop()!;

    this.redoStack.push(currentState);
    this.ranking.assignments = previousState;
    this.ranking.updatedAt = Date.now();

    return {
      success: true,
      operation: { type: 'batch', operations: [] },
      previousState: currentState,
      newState: previousState,
    };
  }

  redo(): OperationResult | null {
    if (!this.canRedo()) return null;

    const currentState = [...this.ranking.assignments];
    const nextState = this.redoStack.pop()!;

    this.undoStack.push(currentState);
    this.ranking.assignments = nextState;
    this.ranking.updatedAt = Date.now();

    return {
      success: true,
      operation: { type: 'batch', operations: [] },
      previousState: currentState,
      newState: nextState,
    };
  }

  // ---------------------------------------------------------------------------
  // Visualization Adapters
  // ---------------------------------------------------------------------------

  toGrid(config?: Partial<GridVisualization>): GridRankingView {
    const fullConfig = { ...DEFAULT_GRID_CONFIG, ...config };
    const slots: GridRankingView['slots'] = [];

    for (let i = 0; i < this.ranking.size; i++) {
      const item = this.getItemAtPosition(i);
      slots.push({
        position: i,
        item,
        isOccupied: item !== null,
        isPodium: fullConfig.highlightPodium && i < 3,
      });
    }

    const filled = this.ranking.assignments.length;
    const empty = this.ranking.size - filled;

    return {
      type: 'grid',
      config: fullConfig,
      slots,
      statistics: {
        filled,
        empty,
        total: this.ranking.size,
        percentage: this.ranking.size > 0 ? Math.round((filled / this.ranking.size) * 100) : 0,
      },
    };
  }

  toTiers(config?: Partial<TierVisualization>): TieredRankingView {
    const fullConfig = { ...DEFAULT_TIER_CONFIG, ...config };
    const tierMappings = this.calculateTierMappings(fullConfig);
    const tiers: TieredRankingView['tiers'] = [];

    for (const mapping of tierMappings) {
      const tierItems = this.ranking.assignments
        .filter(a => a.position >= mapping.startPosition && a.position < mapping.endPosition)
        .sort((a, b) => a.position - b.position)
        .map(a => this.assignmentToRankedItem(a))
        .filter((item): item is RankedItem => item !== null);

      tiers.push({
        id: mapping.tierId,
        label: mapping.label,
        color: mapping.color,
        items: tierItems,
        startPosition: mapping.startPosition,
        endPosition: mapping.endPosition,
      });
    }

    const tierCounts: Record<string, number> = {};
    const distribution: number[] = [];

    for (const tier of tiers) {
      tierCounts[tier.id] = tier.items.length;
      distribution.push(tier.items.length);
    }

    // Calculate balance score (0-100, higher = more balanced)
    const avg = distribution.reduce((a, b) => a + b, 0) / distribution.length || 0;
    const variance = distribution.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / distribution.length || 0;
    const stdDev = Math.sqrt(variance);
    const balanceScore = avg > 0 ? Math.max(0, 100 - (stdDev / avg) * 100) : 100;

    return {
      type: 'tiers',
      config: fullConfig,
      tiers,
      statistics: {
        tierCounts,
        distribution,
        balanceScore: Math.round(balanceScore),
      },
    };
  }

  toBracket(config?: Partial<BracketVisualization>): BracketRankingView {
    const fullConfig = { ...DEFAULT_BRACKET_CONFIG, ...config };

    // Create bracket structure from current rankings
    // This is a view-only representation - actual bracket management
    // would use the BracketInputAdapter
    const numRounds = Math.log2(fullConfig.bracketSize);
    const rounds: BracketRankingView['rounds'] = [];

    // For now, create a simple representation based on positions
    // A real bracket would track actual matchups
    for (let r = 0; r < numRounds; r++) {
      const matchupsInRound = fullConfig.bracketSize / Math.pow(2, r + 1);
      const matchups: BracketRankingView['rounds'][0]['matchups'] = [];

      for (let m = 0; m < matchupsInRound; m++) {
        matchups.push({
          id: `matchup-r${r}-m${m}`,
          participant1: null,
          participant2: null,
          winner: null,
          isComplete: false,
        });
      }

      const roundNames: Record<number, string> = {
        2: 'Final',
        4: 'Semi-finals',
        8: 'Quarter-finals',
        16: 'Sweet 16',
        32: 'Round of 32',
        64: 'Round of 64',
      };

      const participantsInRound = fullConfig.bracketSize / Math.pow(2, r);
      rounds.push({
        name: roundNames[participantsInRound] || `Round of ${participantsInRound}`,
        matchups,
      });
    }

    // Map current ranking to bracket champion
    const champion = this.getItemAtPosition(0);

    return {
      type: 'bracket',
      config: fullConfig,
      rounds,
      champion,
      statistics: {
        totalMatchups: fullConfig.bracketSize - 1,
        completedMatchups: 0,
        progressPercentage: 0,
      },
    };
  }

  toList(config?: Partial<ListVisualization>): ListRankingView {
    const fullConfig = { ...DEFAULT_LIST_CONFIG, ...config };
    const items = this.getItems();

    // Check for gaps in the ranking
    const positions = this.ranking.assignments.map(a => a.position).sort((a, b) => a - b);
    let hasGaps = false;
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] !== positions[i - 1] + 1) {
        hasGaps = true;
        break;
      }
    }

    return {
      type: 'list',
      config: fullConfig,
      items,
      statistics: {
        count: items.length,
        hasGaps,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Import Adapters
  // ---------------------------------------------------------------------------

  fromGrid(gridItems: { position: number; itemId: string }[]): void {
    this.pushUndo();
    this.ranking.assignments = gridItems.map(item => ({
      itemId: item.itemId,
      position: item.position,
      timestamp: Date.now(),
      source: 'direct' as const,
    }));
    this.ranking.updatedAt = Date.now();
  }

  fromTiers(tieredItems: { tierId: string; itemId: string; tierRank: number }[]): void {
    // This would require tier configuration to map tier IDs to positions
    // For now, assume tiers are ordered and tierRank is position within tier
    this.pushUndo();

    // Sort by tier and rank, then assign positions
    const sorted = [...tieredItems].sort((a, b) => {
      if (a.tierId !== b.tierId) return a.tierId.localeCompare(b.tierId);
      return a.tierRank - b.tierRank;
    });

    this.ranking.assignments = sorted.map((item, index) => ({
      itemId: item.itemId,
      position: index,
      timestamp: Date.now(),
      source: 'tier' as const,
    }));
    this.ranking.updatedAt = Date.now();
  }

  fromBracket(bracketResults: MatchupResult[]): void {
    this.pushUndo();

    // Build ranking from bracket results
    // Champion is first, then losers in reverse round order
    const ranking: string[] = [];
    const roundLosers = new Map<number, string[]>();

    // Find champion (winner of final round)
    const maxRound = Math.max(...bracketResults.map(r => r.round));
    const final = bracketResults.find(r => r.round === maxRound);
    if (final) {
      ranking.push(final.winnerId);
    }

    // Group losers by round
    for (const result of bracketResults) {
      const losers = roundLosers.get(result.round) || [];
      losers.push(result.loserId);
      roundLosers.set(result.round, losers);
    }

    // Add losers from later rounds first (they rank higher)
    const rounds = Array.from(roundLosers.keys()).sort((a, b) => b - a);
    for (const round of rounds) {
      ranking.push(...(roundLosers.get(round) || []));
    }

    this.ranking.assignments = ranking.map((itemId, index) => ({
      itemId,
      position: index,
      timestamp: Date.now(),
      source: 'bracket' as const,
    }));
    this.ranking.updatedAt = Date.now();
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  serialize(): string {
    return JSON.stringify({
      ranking: this.ranking,
      items: Array.from(this.items.entries()),
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.ranking = parsed.ranking;
    this.items = new Map(parsed.items);
    this.undoStack = [];
    this.redoStack = [];
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private assignmentToRankedItem(assignment: PositionAssignment): RankedItem | null {
    const item = this.items.get(assignment.itemId);
    if (!item) return null;

    return {
      item,
      position: assignment.position,
    };
  }

  private pushUndo(): void {
    this.undoStack.push([...this.ranking.assignments]);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  private executeWithoutUndo<T>(fn: () => T): T {
    // Temporarily disable undo tracking
    const savedStack = this.undoStack;
    this.undoStack = [];
    const result = fn();
    this.undoStack = savedStack;
    return result;
  }

  private calculateTierMappings(config: TierVisualization): TierMapping[] {
    const mappings: TierMapping[] = [];
    const size = this.ranking.size;

    if (config.algorithm === 'equal') {
      // Equal distribution
      const tierSize = Math.ceil(size / config.tierCount);
      for (let i = 0; i < config.tierCount; i++) {
        const startPosition = i * tierSize;
        const endPosition = Math.min((i + 1) * tierSize, size);
        if (startPosition >= size) break;

        mappings.push({
          tierId: `tier-${i}`,
          label: config.tierLabels[i] || `Tier ${i + 1}`,
          startPosition,
          endPosition,
          color: config.tierColors[i] || '#888888',
        });
      }
    } else if (config.algorithm === 'pyramid') {
      // Pyramid distribution (fewer items in top tiers)
      let position = 0;
      const weights = [1, 2, 3, 4, 5].slice(0, config.tierCount);
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      for (let i = 0; i < config.tierCount; i++) {
        const tierSize = Math.ceil((weights[i] / totalWeight) * size);
        const startPosition = position;
        const endPosition = Math.min(position + tierSize, size);
        if (startPosition >= size) break;

        mappings.push({
          tierId: `tier-${i}`,
          label: config.tierLabels[i] || `Tier ${i + 1}`,
          startPosition,
          endPosition,
          color: config.tierColors[i] || '#888888',
        });

        position = endPosition;
      }
    } else {
      // Default to equal for other algorithms
      return this.calculateTierMappings({ ...config, algorithm: 'equal' });
    }

    return mappings;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new RankingEngine instance
 */
export function createRankingEngine(
  listId: string,
  size: number,
  initialItems?: RankableItem[]
): RankingEngineImpl {
  return new RankingEngineImpl(listId, size, initialItems);
}
