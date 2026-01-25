/**
 * TierConverter
 * Converts between tier-based rankings and position-based rankings
 */

import { TierDefinition } from './types';

/**
 * Item in a tier with optional order within tier
 */
export interface TierItem {
  itemId: string;
  tierId: string;
  orderInTier: number;  // Position within the tier (0-indexed)
}

/**
 * Tier assignment map
 */
export interface TierAssignment {
  tierId: string;
  tierLabel: string;
  tierIndex: number;  // 0 = top tier
  items: TierItem[];
  capacity?: number;  // Optional limit
}

/**
 * Conversion result from tier to positions
 */
export interface TierToPositionResult {
  positions: Array<{ itemId: string; position: number }>;
  tierAssignments: TierAssignment[];
  unmappedItems: string[];  // Items that couldn't be positioned
}

/**
 * Conversion result from positions to tiers
 */
export interface PositionToTierResult {
  tierAssignments: TierAssignment[];
  itemsPerTier: Map<string, string[]>;
}

/**
 * Conversion strategy for tier-to-position
 */
export type ConversionStrategy =
  | 'even-distribute'   // Spread items evenly within tier range
  | 'top-pack'          // Pack items at the start of tier range
  | 'bottom-pack'       // Pack items at the end of tier range
  | 'random-within'     // Random positions within tier
  | 'preserve-order';   // Use orderInTier to determine position

/**
 * Configuration for conversion
 */
export interface ConversionConfig {
  strategy: ConversionStrategy;
  listSize: number;
  tiers: TierDefinition[];
  allowOverflow?: boolean;  // Allow items beyond capacity
}

/**
 * TierConverter class
 */
export class TierConverter {
  private config: ConversionConfig;

  constructor(config: ConversionConfig) {
    this.config = config;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ConversionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Convert tier assignments to absolute positions
   */
  tierToPositions(assignments: TierAssignment[]): TierToPositionResult {
    const positions: Array<{ itemId: string; position: number }> = [];
    const unmappedItems: string[] = [];
    const { strategy, tiers } = this.config;

    for (const assignment of assignments) {
      const tier = tiers.find(t => t.id === assignment.tierId);
      if (!tier) {
        // Tier not found, mark items as unmapped
        unmappedItems.push(...assignment.items.map(i => i.itemId));
        continue;
      }

      const tierStart = tier.startPosition;
      const tierEnd = tier.endPosition;
      const tierSize = tierEnd - tierStart;
      const itemCount = assignment.items.length;

      if (itemCount === 0) continue;

      // Sort items by orderInTier
      const sortedItems = [...assignment.items].sort((a, b) => a.orderInTier - b.orderInTier);

      switch (strategy) {
        case 'even-distribute': {
          // Spread items evenly across the tier range
          const spacing = itemCount > 1 ? (tierSize - 1) / (itemCount - 1) : 0;
          sortedItems.forEach((item, i) => {
            const position = tierStart + Math.round(i * spacing);
            positions.push({ itemId: item.itemId, position });
          });
          break;
        }

        case 'top-pack': {
          // Pack items at the beginning of tier
          sortedItems.forEach((item, i) => {
            const position = tierStart + i;
            if (position < tierEnd) {
              positions.push({ itemId: item.itemId, position });
            } else {
              unmappedItems.push(item.itemId);
            }
          });
          break;
        }

        case 'bottom-pack': {
          // Pack items at the end of tier
          const startOffset = Math.max(0, tierSize - itemCount);
          sortedItems.forEach((item, i) => {
            const position = tierStart + startOffset + i;
            if (position < tierEnd) {
              positions.push({ itemId: item.itemId, position });
            } else {
              unmappedItems.push(item.itemId);
            }
          });
          break;
        }

        case 'random-within': {
          // Random positions within tier (avoiding collisions)
          const usedPositions = new Set<number>();
          const availablePositions: number[] = [];

          for (let p = tierStart; p < tierEnd; p++) {
            availablePositions.push(p);
          }

          // Shuffle available positions
          for (let i = availablePositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availablePositions[i], availablePositions[j]] =
              [availablePositions[j], availablePositions[i]];
          }

          sortedItems.forEach((item, i) => {
            if (i < availablePositions.length) {
              positions.push({ itemId: item.itemId, position: availablePositions[i] });
            } else {
              unmappedItems.push(item.itemId);
            }
          });
          break;
        }

        case 'preserve-order':
        default: {
          // Use orderInTier directly, starting from tier start
          sortedItems.forEach((item, i) => {
            const position = tierStart + i;
            if (position < tierEnd) {
              positions.push({ itemId: item.itemId, position });
            } else {
              unmappedItems.push(item.itemId);
            }
          });
          break;
        }
      }
    }

    // Sort positions by position number
    positions.sort((a, b) => a.position - b.position);

    return {
      positions,
      tierAssignments: assignments,
      unmappedItems,
    };
  }

  /**
   * Convert absolute positions to tier assignments
   */
  positionsToTiers(
    positions: Array<{ itemId: string; position: number }>
  ): PositionToTierResult {
    const { tiers } = this.config;
    const tierAssignments: TierAssignment[] = [];
    const itemsPerTier = new Map<string, string[]>();

    // Initialize tier assignments
    tiers.forEach((tier, index) => {
      tierAssignments.push({
        tierId: tier.id,
        tierLabel: tier.label,
        tierIndex: index,
        items: [],
      });
      itemsPerTier.set(tier.id, []);
    });

    // Sort positions
    const sortedPositions = [...positions].sort((a, b) => a.position - b.position);

    // Assign each item to appropriate tier
    for (const { itemId, position } of sortedPositions) {
      const tier = this.getTierForPosition(position);
      if (tier) {
        const assignment = tierAssignments.find(a => a.tierId === tier.id);
        if (assignment) {
          const orderInTier = assignment.items.length;
          assignment.items.push({ itemId, tierId: tier.id, orderInTier });
          itemsPerTier.get(tier.id)?.push(itemId);
        }
      }
    }

    return { tierAssignments, itemsPerTier };
  }

  /**
   * Get tier for a given position
   */
  private getTierForPosition(position: number): TierDefinition | null {
    for (const tier of this.config.tiers) {
      if (position >= tier.startPosition && position < tier.endPosition) {
        return tier;
      }
    }
    // Return last tier if position is at the very end
    const lastTier = this.config.tiers[this.config.tiers.length - 1];
    if (lastTier && position === lastTier.endPosition) {
      return lastTier;
    }
    return null;
  }

  /**
   * Move item within tier (reorder)
   */
  reorderWithinTier(
    assignment: TierAssignment,
    itemId: string,
    newOrderInTier: number
  ): TierAssignment {
    const items = [...assignment.items];
    const currentIndex = items.findIndex(i => i.itemId === itemId);

    if (currentIndex === -1) return assignment;

    // Remove from current position
    const [item] = items.splice(currentIndex, 1);

    // Clamp new position
    const clampedOrder = Math.max(0, Math.min(items.length, newOrderInTier));

    // Insert at new position
    items.splice(clampedOrder, 0, item);

    // Update all orderInTier values
    items.forEach((i, idx) => {
      i.orderInTier = idx;
    });

    return { ...assignment, items };
  }

  /**
   * Move item to different tier
   */
  moveBetweenTiers(
    assignments: TierAssignment[],
    itemId: string,
    targetTierId: string,
    targetOrderInTier?: number
  ): TierAssignment[] {
    const result = assignments.map(a => ({
      ...a,
      items: [...a.items],
    }));

    // Find and remove from source tier
    let removedItem: TierItem | null = null;
    for (const assignment of result) {
      const index = assignment.items.findIndex(i => i.itemId === itemId);
      if (index !== -1) {
        [removedItem] = assignment.items.splice(index, 1);
        // Update remaining items' orderInTier
        assignment.items.forEach((i, idx) => {
          i.orderInTier = idx;
        });
        break;
      }
    }

    if (!removedItem) return assignments;

    // Add to target tier
    const targetAssignment = result.find(a => a.tierId === targetTierId);
    if (targetAssignment) {
      const order = targetOrderInTier ?? targetAssignment.items.length;
      const clampedOrder = Math.max(0, Math.min(targetAssignment.items.length, order));

      targetAssignment.items.splice(clampedOrder, 0, {
        ...removedItem,
        tierId: targetTierId,
        orderInTier: clampedOrder,
      });

      // Update all orderInTier values
      targetAssignment.items.forEach((i, idx) => {
        i.orderInTier = idx;
      });
    }

    return result;
  }

  /**
   * Check if tier has capacity for more items
   */
  checkTierCapacity(assignment: TierAssignment): {
    hasCapacity: boolean;
    currentCount: number;
    maxCapacity: number | null;
    remainingSlots: number | null;
  } {
    const tier = this.config.tiers.find(t => t.id === assignment.tierId);
    const tierSize = tier ? tier.endPosition - tier.startPosition : 0;

    // Use explicit capacity or tier size
    const maxCapacity = assignment.capacity ?? tierSize;
    const currentCount = assignment.items.length;

    return {
      hasCapacity: currentCount < maxCapacity,
      currentCount,
      maxCapacity: assignment.capacity ?? null,
      remainingSlots: assignment.capacity ? maxCapacity - currentCount : null,
    };
  }

  /**
   * Auto-arrange items in a tier to fill positions optimally
   */
  autoArrangeInTier(assignment: TierAssignment): TierItem[] {
    // Simply ensure orderInTier is sequential
    return assignment.items.map((item, index) => ({
      ...item,
      orderInTier: index,
    }));
  }

  /**
   * Validate tier assignments
   */
  validateAssignments(assignments: TierAssignment[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const allItemIds = new Set<string>();

    for (const assignment of assignments) {
      // Check for duplicate items
      for (const item of assignment.items) {
        if (allItemIds.has(item.itemId)) {
          errors.push(`Item ${item.itemId} appears in multiple tiers`);
        }
        allItemIds.add(item.itemId);
      }

      // Check capacity
      const capacity = this.checkTierCapacity(assignment);
      if (!capacity.hasCapacity && capacity.maxCapacity !== null) {
        warnings.push(
          `Tier ${assignment.tierLabel} exceeds capacity (${capacity.currentCount}/${capacity.maxCapacity})`
        );
      }

      // Check tier exists
      const tier = this.config.tiers.find(t => t.id === assignment.tierId);
      if (!tier) {
        errors.push(`Unknown tier: ${assignment.tierId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Factory function
 */
export function createTierConverter(config: ConversionConfig): TierConverter {
  return new TierConverter(config);
}

/**
 * Quick convert from tiers to positions
 */
export function convertTiersToPositions(
  assignments: TierAssignment[],
  tiers: TierDefinition[],
  listSize: number,
  strategy: ConversionStrategy = 'preserve-order'
): TierToPositionResult {
  const converter = new TierConverter({ strategy, tiers, listSize });
  return converter.tierToPositions(assignments);
}

/**
 * Quick convert from positions to tiers
 */
export function convertPositionsToTiers(
  positions: Array<{ itemId: string; position: number }>,
  tiers: TierDefinition[],
  listSize: number
): PositionToTierResult {
  const converter = new TierConverter({
    strategy: 'preserve-order',
    tiers,
    listSize,
  });
  return converter.positionsToTiers(positions);
}

export default TierConverter;
