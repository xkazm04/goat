/**
 * AutoArrangeEngine
 * Intelligent item placement algorithm for smart grid
 */

import { GridItemType } from "@/types/match";
import { TierDefinition, TierId, adjustTiersForSize, getTierForPosition } from "./tierConfig";
import { SmartGridLayout, ItemMetadata, ArrangementStrategy } from "./smartGridLayout";

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
  }

  /**
   * Automatic arrangement based on item metadata
   */
  private autoArrange(
    currentGrid: GridItemType[],
    customSort?: (a: GridItemType, b: GridItemType) => number
  ): ArrangeResult {
    const moves: Array<{ from: number; to: number; itemId: string }> = [];
    const newGrid = [...currentGrid];

    // Collect all filled items
    const filledItems: Array<{ position: number; item: GridItemType }> = [];
    currentGrid.forEach((item, position) => {
      if (item?.matched) {
        filledItems.push({ position, item });
      }
    });

    if (filledItems.length === 0) {
      return {
        newGrid,
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
      // Default: sort by a scoring heuristic
      filledItems.sort((a, b) => {
        // Items with images rank higher
        const imageScoreA = a.item.image_url ? 10 : 0;
        const imageScoreB = b.item.image_url ? 10 : 0;

        // Items with titles rank higher
        const titleScoreA = a.item.title ? 5 : 0;
        const titleScoreB = b.item.title ? 5 : 0;

        // Use current position as tiebreaker (lower = better)
        const posScoreA = 50 - a.position;
        const posScoreB = 50 - b.position;

        const totalA = imageScoreA + titleScoreA + posScoreA;
        const totalB = imageScoreB + titleScoreB + posScoreB;

        return totalB - totalA;
      });
    }

    // Clear all positions
    for (let i = 0; i < this.listSize; i++) {
      newGrid[i] = { ...newGrid[i], matched: false, backlogItemId: undefined };
    }

    // Place items in sorted order
    let targetPosition = 0;
    for (const { position: originalPosition, item } of filledItems) {
      if (targetPosition >= this.listSize) break;

      newGrid[targetPosition] = {
        ...item,
        position: targetPosition,
      };

      if (originalPosition !== targetPosition) {
        moves.push({
          from: originalPosition,
          to: targetPosition,
          itemId: item.backlogItemId || item.id || String(originalPosition),
        });
      }

      targetPosition++;
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

      // Collect items in this tier
      const tierItems: Array<{ position: number; item: GridItemType }> = [];
      for (let i = startPos; i < tier.range.end; i++) {
        if (currentGrid[i]?.matched) {
          tierItems.push({ position: i, item: currentGrid[i] });
        }
      }

      // Shuffle using Fisher-Yates
      for (let i = tierItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tierItems[i], tierItems[j]] = [tierItems[j], tierItems[i]];
      }

      // Get empty positions in tier
      const emptyPositions: number[] = [];
      for (let i = startPos; i < tier.range.end; i++) {
        if (!currentGrid[i]?.matched) {
          emptyPositions.push(i);
        }
      }

      // Combine filled positions with empty for placement
      const allPositions = tierItems
        .map(ti => ti.position)
        .concat(emptyPositions)
        .slice(0, tierItems.length);

      // Place shuffled items
      tierItems.forEach((ti, idx) => {
        const newPosition = allPositions[idx];
        newGrid[newPosition] = {
          ...ti.item,
          position: newPosition,
        };

        if (ti.position !== newPosition) {
          moves.push({
            from: ti.position,
            to: newPosition,
            itemId: ti.item.backlogItemId || ti.item.id || String(ti.position),
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
      position: i,
      matched: false,
    })) as GridItemType[];

    // Collect all filled items preserving order
    const filledItems: GridItemType[] = [];
    const startIndex = preservePodium ? 3 : 0;

    // Preserve podium if needed
    if (preservePodium) {
      for (let i = 0; i < 3; i++) {
        if (currentGrid[i]?.matched) {
          newGrid[i] = { ...currentGrid[i], position: i };
        }
      }
    }

    // Collect remaining items
    for (let i = startIndex; i < this.listSize; i++) {
      if (currentGrid[i]?.matched) {
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
          itemId: item.backlogItemId || item.id || String(originalPosition),
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
      position: i,
      matched: false,
    })) as GridItemType[];

    // Collect all filled items
    const filledItems: GridItemType[] = [];
    currentGrid.forEach(item => {
      if (item?.matched) {
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
            itemId: item.backlogItemId || item.id || String(originalPosition),
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
      if (currentGrid[i]?.matched) {
        filledItems.push({ position: i, item: currentGrid[i] });
      }
    }

    // Get positions to fill
    const targetPositions: number[] = [];
    for (let i = startIndex; i < this.listSize; i++) {
      if (currentGrid[i]?.matched) {
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
          itemId: fi.item.backlogItemId || fi.item.id || String(fi.position),
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
        if (currentGrid[i]?.matched) {
          tierItems.push(currentGrid[i]);
          tierPositions.push(i);
        }
      }

      // Sort by title
      tierItems.sort((a, b) => {
        const titleA = a.title || '';
        const titleB = b.title || '';
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
            itemId: item.backlogItemId || item.id || String(originalPosition),
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
          if (!currentGrid[i]?.matched) {
            return i;
          }
        }
      }
    }

    // Otherwise find first empty position
    for (let i = 0; i < this.listSize; i++) {
      if (!currentGrid[i]?.matched) {
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
    const filledCount = currentGrid.filter(i => i?.matched).length;

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
      if (item?.matched) {
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
 * Create auto-arrange engine instance
 */
export function createAutoArrangeEngine(listSize: number = 50): AutoArrangeEngine {
  return new AutoArrangeEngine(listSize);
}

export default AutoArrangeEngine;
