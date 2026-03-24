/**
 * AutoArrangeEngine
 * Intelligent item placement algorithm for smart grid
 */

import { timeSync } from "@/lib/perf/perfTimer";
import { GridItemType } from "@/types/match";

import { SmartGridLayout } from "./smartGridLayout";
import { TierDefinition, TierId, adjustTiersForSize } from "./tierConfig";

/**
 * Arrangement mode
 */
export type ArrangeMode =
  | 'auto'           // Fully automatic based on metadata
  | 'shuffle'        // Random shuffle within tiers
  | 'compress'       // Move all items to top
  | 'spread'         // Evenly distribute across tiers
  | 'reverse'        // Reverse current order
  | 'tier-sort';     // Sort within each tier

/**
 * Arrangement result
 */
export interface ArrangeResult {
  /** New grid state after arrangement */
  newGrid: GridItemType[];
  /** Number of items moved */
  moveCount: number;
  /** Moves performed (for animation) */
  moves: Array<{ from: number; to: number; itemId: string }>;
  /** Whether arrangement was successful */
  success: boolean;
  /** Message describing the result */
  message: string;
}

/**
 * Auto-arrange options
 */
export interface AutoArrangeEngineOptions {
  /** Mode of arrangement */
  mode: ArrangeMode;
  /** Whether to animate the transitions */
  animate?: boolean;
  /** Delay between moves (ms) for staggered animation */
  staggerDelay?: number;
  /** Whether to preserve podium positions (1-3) */
  preservePodium?: boolean;
  /** Custom sort function for 'auto' mode */
  customSort?: (a: GridItemType, b: GridItemType) => number;
}

/**
 * AutoArrangeEngine class
 */
export class AutoArrangeEngine {
  private listSize: number;
  private tiers: TierDefinition[];
  private layoutEngine: SmartGridLayout;

  constructor(listSize: number = 50) {
    this.listSize = listSize;
    this.tiers = adjustTiersForSize(listSize);
    this.layoutEngine = new SmartGridLayout(listSize);
  }

  /**
   * Execute auto-arrangement
   */
  arrange(
    currentGrid: GridItemType[],
    options: AutoArrangeEngineOptions
  ): ArrangeResult {
    const { mode, preservePodium = false, customSort } = options;
    const itemCount = currentGrid.filter(i => i?.context.matched).length;

    return timeSync('AutoArrangeEngine.arrange', { mode, itemCount, listSize: this.listSize }, () => {
      switch (mode) {
        case 'auto':
          return this.autoArrange(currentGrid, customSort);
        case 'shuffle':
          return this.shuffleArrange(currentGrid, preservePodium);
        case 'compress':
          return this.compressArrange(currentGrid, preservePodium);
        case 'spread':
          return this.spreadArrange(currentGrid);
        case 'reverse':
          return this.reverseArrange(currentGrid, preservePodium);
        case 'tier-sort':
          return this.tierSortArrange(currentGrid);
        default:
          return {
            newGrid: currentGrid,
            moveCount: 0,
            moves: [],
            success: false,
            message: 'Unknown arrangement mode',
          };
      }
    });
  }

  /**
   * Automatic arrangement based on item metadata
   */
  private autoArrange(
    currentGrid: GridItemType[],
    customSort?: (a: GridItemType, b: GridItemType) => number
  ): ArrangeResult {
    const moves: Array<{ from: number; to: number; itemId: string }> = [];

    // Collect all filled items
    const filledItems: Array<{ position: number; item: GridItemType }> = [];
    for (let i = 0; i < currentGrid.length; i++) {
      if (currentGrid[i]?.context.matched) {
        filledItems.push({ position: i, item: currentGrid[i] });
      }
    }

    if (filledItems.length === 0) {
      return {
        newGrid: currentGrid,
        moveCount: 0,
        moves: [],
        success: true,
        message: 'No items to arrange',
      };
    }

    // Sort items
    if (customSort) {
      filledItems.sort((a, b) => customSort(a.item, b.item));
    } else {
      filledItems.sort((a, b) => {
        const scoreA = (a.item.item?.image_url ? 10 : 0) + (a.item.item?.title ? 5 : 0) + (50 - a.position);
        const scoreB = (b.item.item?.image_url ? 10 : 0) + (b.item.item?.title ? 5 : 0) + (50 - b.position);
        return scoreB - scoreA;
      });
    }

    // Build new grid directly — empty slots + sorted items in one pass
    const newGrid: GridItemType[] = Array(this.listSize);
    for (let i = 0; i < this.listSize; i++) {
      newGrid[i] = { id: `grid-${i}`, position: i, item: null, context: { source: 'grid', matched: false } } as GridItemType;
    }

    for (let i = 0; i < filledItems.length && i < this.listSize; i++) {
      const { position: originalPosition, item } = filledItems[i];
      newGrid[i] = { ...item, position: i };

      if (originalPosition !== i) {
        moves.push({
          from: originalPosition,
          to: i,
          itemId: item.item?.id || item.id || String(originalPosition),
        });
      }
    }

    return {
      newGrid,
      moveCount: moves.length,
      moves,
      success: true,
      message: `Auto-arranged ${filledItems.length} items`,
    };
  }

  /**
   * Shuffle arrangement (random within tiers)
   */
  private shuffleArrange(
    currentGrid: GridItemType[],
    preservePodium: boolean
  ): ArrangeResult {
    const moves: Array<{ from: number; to: number; itemId: string }> = [];
    const newGrid = [...currentGrid];

    for (const tier of this.tiers) {
      const startPos = preservePodium && tier.range.start < 3
        ? Math.max(tier.range.start, 3)
        : tier.range.start;

      // Collect items and their original positions in this tier separately
      const tierItems: GridItemType[] = [];
      const filledPositions: number[] = [];
      for (let i = startPos; i < tier.range.end; i++) {
        if (currentGrid[i]?.context.matched) {
          tierItems.push(currentGrid[i]);
          filledPositions.push(i);
        }
      }

      // Shuffle items using Fisher-Yates (positions array stays fixed)
      for (let i = tierItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tierItems[i], tierItems[j]] = [tierItems[j], tierItems[i]];
      }

      // Place shuffled items into the original filled positions
      tierItems.forEach((item, idx) => {
        const newPosition = filledPositions[idx];
        const originalPosition = item.position;
        newGrid[newPosition] = {
          ...item,
          position: newPosition,
        };

        if (originalPosition !== newPosition) {
          moves.push({
            from: originalPosition,
            to: newPosition,
            itemId: item.item?.id || item.id || String(originalPosition),
          });
        }
      });
    }

    return {
      newGrid,
      moveCount: moves.length,
      moves,
      success: true,
      message: `Shuffled items within tiers`,
    };
  }

  /**
   * Compress arrangement (move all to top)
   */
  private compressArrange(
    currentGrid: GridItemType[],
    preservePodium: boolean
  ): ArrangeResult {
    const moves: Array<{ from: number; to: number; itemId: string }> = [];
    const newGrid = Array(this.listSize).fill(null).map((_, i) => ({
      id: `grid-${i}`,
      position: i,
      item: null,
      context: { source: 'grid' as const, matched: false },
    })) as GridItemType[];

    // Collect all filled items preserving order
    const filledItems: GridItemType[] = [];
    const startIndex = preservePodium ? 3 : 0;

    // Preserve podium if needed
    if (preservePodium) {
      for (let i = 0; i < 3; i++) {
        if (currentGrid[i]?.context.matched) {
          newGrid[i] = { ...currentGrid[i], position: i };
        }
      }
    }

    // Collect remaining items
    for (let i = startIndex; i < this.listSize; i++) {
      if (currentGrid[i]?.context.matched) {
        filledItems.push(currentGrid[i]);
      }
    }

    // Place compressed
    let targetPosition = startIndex;
    for (const item of filledItems) {
      const originalPosition = item.position;

      newGrid[targetPosition] = {
        ...item,
        position: targetPosition,
      };

      if (originalPosition !== targetPosition) {
        moves.push({
          from: originalPosition,
          to: targetPosition,
          itemId: item.item?.id || item.id || String(originalPosition),
        });
      }

      targetPosition++;
    }

    return {
      newGrid,
      moveCount: moves.length,
      moves,
      success: true,
      message: `Compressed ${filledItems.length} items to top`,
    };
  }

  /**
   * Spread arrangement (distribute evenly across tiers)
   */
  private spreadArrange(currentGrid: GridItemType[]): ArrangeResult {
    const moves: Array<{ from: number; to: number; itemId: string }> = [];
    const newGrid = Array(this.listSize).fill(null).map((_, i) => ({
      id: `grid-${i}`,
      position: i,
      item: null,
      context: { source: 'grid' as const, matched: false },
    })) as GridItemType[];

    // Collect all filled items
    const filledItems: GridItemType[] = [];
    currentGrid.forEach(item => {
      if (item?.context.matched) {
        filledItems.push(item);
      }
    });

    if (filledItems.length === 0) {
      return {
        newGrid,
        moveCount: 0,
        moves: [],
        success: true,
        message: 'No items to spread',
      };
    }

    // Calculate items per tier
    const itemsPerTier = Math.ceil(filledItems.length / this.tiers.length);
    let itemIndex = 0;

    for (const tier of this.tiers) {
      const tierSize = tier.range.end - tier.range.start;
      const tierItemCount = Math.min(
        itemsPerTier,
        filledItems.length - itemIndex,
        tierSize
      );

      if (tierItemCount <= 0) continue;

      // Calculate spacing within tier
      const spacing = tierSize / tierItemCount;

      for (let i = 0; i < tierItemCount && itemIndex < filledItems.length; i++) {
        const targetPosition = tier.range.start + Math.floor(i * spacing);
        const item = filledItems[itemIndex];
        const originalPosition = item.position;

        newGrid[targetPosition] = {
          ...item,
          position: targetPosition,
        };

        if (originalPosition !== targetPosition) {
          moves.push({
            from: originalPosition,
            to: targetPosition,
            itemId: item.item?.id || item.id || String(originalPosition),
          });
        }

        itemIndex++;
      }
    }

    return {
      newGrid,
      moveCount: moves.length,
      moves,
      success: true,
      message: `Spread ${filledItems.length} items across ${this.tiers.length} tiers`,
    };
  }

  /**
   * Reverse arrangement
   */
  private reverseArrange(
    currentGrid: GridItemType[],
    preservePodium: boolean
  ): ArrangeResult {
    const moves: Array<{ from: number; to: number; itemId: string }> = [];
    const newGrid = [...currentGrid];

    const startIndex = preservePodium ? 3 : 0;

    // Collect filled items (reversed)
    const filledItems: Array<{ position: number; item: GridItemType }> = [];
    for (let i = this.listSize - 1; i >= startIndex; i--) {
      if (currentGrid[i]?.context.matched) {
        filledItems.push({ position: i, item: currentGrid[i] });
      }
    }

    // Get positions to fill
    const targetPositions: number[] = [];
    for (let i = startIndex; i < this.listSize; i++) {
      if (currentGrid[i]?.context.matched) {
        targetPositions.push(i);
      }
    }

    // Place in reverse
    filledItems.forEach((fi, idx) => {
      if (idx >= targetPositions.length) return;

      const targetPosition = targetPositions[idx];
      newGrid[targetPosition] = {
        ...fi.item,
        position: targetPosition,
      };

      if (fi.position !== targetPosition) {
        moves.push({
          from: fi.position,
          to: targetPosition,
          itemId: fi.item.item?.id || fi.item.id || String(fi.position),
        });
      }
    });

    return {
      newGrid,
      moveCount: moves.length,
      moves,
      success: true,
      message: `Reversed ${filledItems.length} items`,
    };
  }

  /**
   * Tier-sort arrangement (sort within each tier)
   */
  private tierSortArrange(currentGrid: GridItemType[]): ArrangeResult {
    const moves: Array<{ from: number; to: number; itemId: string }> = [];
    const newGrid = [...currentGrid];

    for (const tier of this.tiers) {
      // Collect items in this tier
      const tierItems: GridItemType[] = [];
      const tierPositions: number[] = [];

      for (let i = tier.range.start; i < tier.range.end; i++) {
        if (currentGrid[i]?.context.matched) {
          tierItems.push(currentGrid[i]);
          tierPositions.push(i);
        }
      }

      // Sort by title
      tierItems.sort((a, b) => {
        const titleA = a.item?.title || '';
        const titleB = b.item?.title || '';
        return titleA.localeCompare(titleB);
      });

      // Place sorted items
      tierItems.forEach((item, idx) => {
        const targetPosition = tierPositions[idx];
        const originalPosition = item.position;

        newGrid[targetPosition] = {
          ...item,
          position: targetPosition,
        };

        if (originalPosition !== targetPosition) {
          moves.push({
            from: originalPosition,
            to: targetPosition,
            itemId: item.item?.id || item.id || String(originalPosition),
          });
        }
      });
    }

    return {
      newGrid,
      moveCount: moves.length,
      moves,
      success: true,
      message: `Sorted items within each tier`,
    };
  }

  /**
   * Suggest next best position for an item
   */
  suggestNextPosition(
    currentGrid: GridItemType[],
    preferredTier?: TierId
  ): number | null {
    // If preferred tier specified, try that first
    if (preferredTier) {
      const tier = this.tiers.find(t => t.id === preferredTier);
      if (tier) {
        for (let i = tier.range.start; i < tier.range.end; i++) {
          if (!currentGrid[i]?.context.matched) {
            return i;
          }
        }
      }
    }

    // Otherwise find first empty position
    for (let i = 0; i < this.listSize; i++) {
      if (!currentGrid[i]?.context.matched) {
        return i;
      }
    }

    return null;
  }

  /**
   * Get arrangement preview (for UI feedback)
   */
  getArrangementPreview(
    currentGrid: GridItemType[],
    mode: ArrangeMode
  ): {
    affectedPositions: number[];
    estimatedMoves: number;
    description: string;
  } {
    const filledCount = currentGrid.filter(i => i?.context.matched).length;

    const descriptions: Record<ArrangeMode, string> = {
      auto: `Automatically sort ${filledCount} items by relevance`,
      shuffle: `Randomly shuffle items within their tiers`,
      compress: `Move all ${filledCount} items to top positions`,
      spread: `Evenly distribute items across all tiers`,
      reverse: `Reverse the order of all items`,
      'tier-sort': `Alphabetically sort items within each tier`,
    };

    // Get affected positions (all filled positions)
    const affectedPositions: number[] = [];
    currentGrid.forEach((item, pos) => {
      if (item?.context.matched) {
        affectedPositions.push(pos);
      }
    });

    return {
      affectedPositions,
      estimatedMoves: Math.floor(filledCount * 0.7), // Rough estimate
      description: descriptions[mode] || 'Unknown arrangement mode',
    };
  }
}

/**
 * Cached engine instances keyed by listSize.
 * Engines are stateless (all state comes from the grid passed to arrange()),
 * so a single instance per listSize is safe to reuse.
 */
const engineCache = new Map<number, AutoArrangeEngine>();

/**
 * Create or retrieve a cached AutoArrangeEngine instance for the given list size.
 */
export function createAutoArrangeEngine(listSize: number = 50): AutoArrangeEngine {
  const cached = engineCache.get(listSize);
  if (cached) return cached;

  const engine = new AutoArrangeEngine(listSize);
  engineCache.set(listSize, engine);
  return engine;
}

export default AutoArrangeEngine;
