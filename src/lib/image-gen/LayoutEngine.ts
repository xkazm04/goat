/**
 * LayoutEngine
 * Auto-arrangement algorithm for optimal item placement
 * Supports multiple layout types with smart selection based on content
 */

import type {
  Layout,
  LayoutType,
  LayoutCell,
  LayoutItem,
  LayoutOptions,
  LayoutPosition,
  AutoLayoutCriteria,
} from './types';

/**
 * Default layout options
 */
const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  layoutType: 'auto',
  targetWidth: 1200,
  targetHeight: 630,
  itemCount: 10,
  emphasizeTop: 3,
  padding: 24,
  spacing: 12,
  gap: 12,
  maxColumns: 5,
  showRankNumbers: true,
  showLabels: true,
};

/**
 * Layout scoring weights for auto-selection
 */
const LAYOUT_SCORES: Record<LayoutType, (criteria: AutoLayoutCriteria) => number> = {
  grid: (c) => {
    // Grid works well for many items with similar importance
    let score = 0.5;
    if (c.itemCount >= 6 && c.itemCount <= 25) score += 0.3;
    if (c.hasImages && c.imageQuality !== 'low') score += 0.2;
    return score;
  },
  podium: (c) => {
    // Podium is best for emphasizing top 3
    let score = 0.6;
    if (c.itemCount >= 3 && c.itemCount <= 15) score += 0.3;
    if (c.targetAspectRatio > 1.5) score += 0.1;
    return score;
  },
  pyramid: (c) => {
    // Pyramid for clear hierarchy
    let score = 0.4;
    if (c.itemCount >= 5 && c.itemCount <= 20) score += 0.2;
    if (c.hasImages) score += 0.2;
    return score;
  },
  masonry: (c) => {
    // Masonry for visual interest with varied images
    let score = 0.3;
    if (c.hasImages && c.imageQuality === 'high') score += 0.4;
    if (c.itemCount >= 8) score += 0.2;
    return score;
  },
  featured: (c) => {
    // Featured for emphasizing #1 with context
    let score = 0.5;
    if (c.itemCount >= 3 && c.itemCount <= 10) score += 0.3;
    if (c.hasImages) score += 0.2;
    return score;
  },
  timeline: (c) => {
    // Timeline for chronological feel
    let score = 0.3;
    if (c.itemCount >= 5 && c.itemCount <= 12) score += 0.3;
    if (c.targetAspectRatio > 2) score += 0.2;
    return score;
  },
  cascade: (c) => {
    // Cascade for dynamic, modern feel
    let score = 0.4;
    if (c.hasImages && c.imageQuality !== 'low') score += 0.3;
    if (c.itemCount <= 10) score += 0.2;
    return score;
  },
  compact: (c) => {
    // Compact for many items or small spaces
    let score = 0.4;
    if (c.itemCount > 20) score += 0.4;
    if (!c.hasImages) score += 0.2;
    return score;
  },
};

/**
 * LayoutEngine class
 */
export class LayoutEngine {
  private options: Required<LayoutOptions>;

  constructor(options: Partial<LayoutOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate a layout for the given items
   */
  generateLayout(items: LayoutItem[], options: Partial<LayoutOptions> = {}): Layout {
    const opts = { ...this.options, ...options };
    const layoutType = opts.layoutType === 'auto'
      ? this.selectBestLayout(items, opts)
      : opts.layoutType as LayoutType;

    const cells = this.generateCells(layoutType, items.length, opts);
    const balance = this.calculateVisualBalance(cells, opts);

    return {
      type: layoutType,
      cells,
      dimensions: {
        width: opts.targetWidth,
        height: opts.targetHeight,
      },
      metadata: {
        itemCount: items.length,
        aspectRatio: opts.targetWidth / opts.targetHeight,
        visualBalance: balance,
        complexity: this.getComplexity(layoutType, items.length),
      },
    };
  }

  /**
   * Select the best layout type based on content
   */
  selectBestLayout(items: LayoutItem[], opts: Required<LayoutOptions>): LayoutType {
    const criteria: AutoLayoutCriteria = {
      itemCount: items.length,
      hasImages: items.some(item => item.imageUrl),
      imageQuality: this.estimateImageQuality(items),
      targetAspectRatio: opts.targetWidth / opts.targetHeight,
    };

    let bestLayout: LayoutType = 'grid';
    let bestScore = 0;

    for (const [layout, scoreFn] of Object.entries(LAYOUT_SCORES)) {
      const score = scoreFn(criteria);
      if (score > bestScore) {
        bestScore = score;
        bestLayout = layout as LayoutType;
      }
    }

    return bestLayout;
  }

  /**
   * Generate cells for a specific layout type
   */
  private generateCells(
    type: LayoutType,
    itemCount: number,
    opts: Required<LayoutOptions>
  ): LayoutCell[] {
    switch (type) {
      case 'grid':
        return this.generateGridCells(itemCount, opts);
      case 'podium':
        return this.generatePodiumCells(itemCount, opts);
      case 'pyramid':
        return this.generatePyramidCells(itemCount, opts);
      case 'featured':
        return this.generateFeaturedCells(itemCount, opts);
      case 'masonry':
        return this.generateMasonryCells(itemCount, opts);
      case 'timeline':
        return this.generateTimelineCells(itemCount, opts);
      case 'cascade':
        return this.generateCascadeCells(itemCount, opts);
      case 'compact':
        return this.generateCompactCells(itemCount, opts);
      default:
        return this.generateGridCells(itemCount, opts);
    }
  }

  /**
   * Grid layout - equal-sized cells in rows
   */
  private generateGridCells(itemCount: number, opts: Required<LayoutOptions>): LayoutCell[] {
    const cells: LayoutCell[] = [];
    const { targetWidth, targetHeight, padding, gap, emphasizeTop } = opts;

    // Calculate optimal grid dimensions
    const aspectRatio = targetWidth / targetHeight;
    let cols = Math.ceil(Math.sqrt(itemCount * aspectRatio));
    let rows = Math.ceil(itemCount / cols);

    // Adjust to fit items
    while (cols * rows < itemCount) {
      if (cols / rows < aspectRatio) cols++;
      else rows++;
    }

    const cellWidth = (targetWidth - 2 * padding - (cols - 1) * gap) / cols;
    const cellHeight = (targetHeight - 2 * padding - (rows - 1) * gap) / rows;

    for (let i = 0; i < itemCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const rank = i + 1;

      cells.push({
        index: i,
        rank,
        x: padding + col * (cellWidth + gap),
        y: padding + row * (cellHeight + gap),
        width: cellWidth,
        height: cellHeight,
        zIndex: itemCount - i,
        emphasis: rank <= emphasizeTop ? 'high' : rank <= emphasizeTop * 2 ? 'medium' : 'low',
        showLabel: opts.showLabels,
        labelPosition: 'bottom',
      });
    }

    return cells;
  }

  /**
   * Podium layout - top 3 emphasized, rest in smaller grid
   */
  private generatePodiumCells(itemCount: number, opts: Required<LayoutOptions>): LayoutCell[] {
    const cells: LayoutCell[] = [];
    const { targetWidth, targetHeight, padding, gap } = opts;

    // Podium takes 60% of height
    const podiumHeight = (targetHeight - 2 * padding) * 0.6;
    const podiumY = padding;

    // Top 3 positions (2nd, 1st, 3rd)
    if (itemCount >= 1) {
      // #1 - Center, tallest
      const firstWidth = (targetWidth - 2 * padding - 2 * gap) * 0.4;
      cells.push({
        index: 0,
        rank: 1,
        x: (targetWidth - firstWidth) / 2,
        y: podiumY,
        width: firstWidth,
        height: podiumHeight,
        zIndex: 100,
        emphasis: 'high',
        showLabel: opts.showLabels,
        labelPosition: 'bottom',
      });
    }

    if (itemCount >= 2) {
      // #2 - Left, shorter
      const secondWidth = (targetWidth - 2 * padding - 2 * gap) * 0.3;
      cells.push({
        index: 1,
        rank: 2,
        x: padding,
        y: podiumY + podiumHeight * 0.15,
        width: secondWidth,
        height: podiumHeight * 0.85,
        zIndex: 99,
        emphasis: 'high',
        showLabel: opts.showLabels,
        labelPosition: 'bottom',
      });
    }

    if (itemCount >= 3) {
      // #3 - Right, shortest
      const thirdWidth = (targetWidth - 2 * padding - 2 * gap) * 0.3;
      cells.push({
        index: 2,
        rank: 3,
        x: targetWidth - padding - thirdWidth,
        y: podiumY + podiumHeight * 0.25,
        width: thirdWidth,
        height: podiumHeight * 0.75,
        zIndex: 98,
        emphasis: 'high',
        showLabel: opts.showLabels,
        labelPosition: 'bottom',
      });
    }

    // Remaining items in grid below
    if (itemCount > 3) {
      const restY = podiumY + podiumHeight + gap;
      const restHeight = targetHeight - padding - restY;
      const restCount = itemCount - 3;
      const cols = Math.min(restCount, 5);
      const rows = Math.ceil(restCount / cols);
      const cellWidth = (targetWidth - 2 * padding - (cols - 1) * gap) / cols;
      const cellHeight = (restHeight - (rows - 1) * gap) / rows;

      for (let i = 3; i < itemCount; i++) {
        const localIndex = i - 3;
        const row = Math.floor(localIndex / cols);
        const col = localIndex % cols;

        cells.push({
          index: i,
          rank: i + 1,
          x: padding + col * (cellWidth + gap),
          y: restY + row * (cellHeight + gap),
          width: cellWidth,
          height: cellHeight,
          zIndex: 90 - localIndex,
          emphasis: 'low',
          showLabel: opts.showLabels,
          labelPosition: 'overlay',
        });
      }
    }

    return cells;
  }

  /**
   * Pyramid layout - descending size from top
   */
  private generatePyramidCells(itemCount: number, opts: Required<LayoutOptions>): LayoutCell[] {
    const cells: LayoutCell[] = [];
    const { targetWidth, targetHeight, padding, gap, emphasizeTop } = opts;

    const usableWidth = targetWidth - 2 * padding;
    const usableHeight = targetHeight - 2 * padding;

    // Distribute items in pyramid rows: 1, 2, 3, 4...
    const rows: number[] = [];
    let remaining = itemCount;
    let rowSize = 1;

    while (remaining > 0) {
      const inRow = Math.min(rowSize, remaining);
      rows.push(inRow);
      remaining -= inRow;
      rowSize++;
    }

    const rowHeight = (usableHeight - (rows.length - 1) * gap) / rows.length;
    let currentIndex = 0;
    let currentY = padding;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const itemsInRow = rows[rowIndex];
      const cellWidth = (usableWidth - (itemsInRow - 1) * gap) / itemsInRow;
      const startX = padding + (usableWidth - itemsInRow * cellWidth - (itemsInRow - 1) * gap) / 2;

      for (let col = 0; col < itemsInRow; col++) {
        const rank = currentIndex + 1;
        cells.push({
          index: currentIndex,
          rank,
          x: startX + col * (cellWidth + gap),
          y: currentY,
          width: cellWidth,
          height: rowHeight,
          zIndex: itemCount - currentIndex,
          emphasis: rank <= emphasizeTop ? 'high' : rank <= emphasizeTop * 2 ? 'medium' : 'low',
          showLabel: opts.showLabels,
          labelPosition: rowIndex === 0 ? 'bottom' : 'overlay',
        });
        currentIndex++;
      }

      currentY += rowHeight + gap;
    }

    return cells;
  }

  /**
   * Featured layout - large hero with supporting items
   */
  private generateFeaturedCells(itemCount: number, opts: Required<LayoutOptions>): LayoutCell[] {
    const cells: LayoutCell[] = [];
    const { targetWidth, targetHeight, padding, gap } = opts;

    // Hero takes left 60%
    const heroWidth = (targetWidth - 2 * padding - gap) * 0.6;
    const heroHeight = targetHeight - 2 * padding;

    cells.push({
      index: 0,
      rank: 1,
      x: padding,
      y: padding,
      width: heroWidth,
      height: heroHeight,
      zIndex: 100,
      emphasis: 'high',
      showLabel: opts.showLabels,
      labelPosition: 'bottom',
    });

    // Supporting items on right
    if (itemCount > 1) {
      const sideX = padding + heroWidth + gap;
      const sideWidth = targetWidth - padding - sideX;
      const supportCount = itemCount - 1;
      const rows = Math.min(supportCount, 4);
      const cellHeight = (heroHeight - (rows - 1) * gap) / rows;

      for (let i = 1; i < Math.min(itemCount, 5); i++) {
        const row = i - 1;
        cells.push({
          index: i,
          rank: i + 1,
          x: sideX,
          y: padding + row * (cellHeight + gap),
          width: sideWidth,
          height: cellHeight,
          zIndex: 99 - row,
          emphasis: i <= 3 ? 'medium' : 'low',
          showLabel: opts.showLabels,
          labelPosition: 'overlay',
        });
      }

      // Additional items below if needed
      if (itemCount > 5) {
        const bottomY = padding + heroHeight + gap;
        const bottomHeight = Math.min(80, (targetHeight - bottomY - padding));
        const cols = Math.min(itemCount - 5, 5);
        const bottomCellWidth = (targetWidth - 2 * padding - (cols - 1) * gap) / cols;

        for (let i = 5; i < itemCount; i++) {
          const col = i - 5;
          if (col >= cols) break;

          cells.push({
            index: i,
            rank: i + 1,
            x: padding + col * (bottomCellWidth + gap),
            y: bottomY,
            width: bottomCellWidth,
            height: bottomHeight,
            zIndex: 80 - col,
            emphasis: 'low',
            showLabel: opts.showLabels,
            labelPosition: 'overlay',
          });
        }
      }
    }

    return cells;
  }

  /**
   * Masonry layout - varied sizes based on rank
   */
  private generateMasonryCells(itemCount: number, opts: Required<LayoutOptions>): LayoutCell[] {
    const cells: LayoutCell[] = [];
    const { targetWidth, targetHeight, padding, gap, emphasizeTop } = opts;

    const usableWidth = targetWidth - 2 * padding;
    const usableHeight = targetHeight - 2 * padding;

    // Use 3 columns for masonry
    const cols = 3;
    const colWidth = (usableWidth - (cols - 1) * gap) / cols;
    const colHeights = [0, 0, 0];

    for (let i = 0; i < itemCount; i++) {
      const rank = i + 1;
      // Vary height based on rank (top items are taller)
      const heightMultiplier = rank <= emphasizeTop ? 1.5 : rank <= emphasizeTop * 2 ? 1.2 : 1;
      const baseHeight = usableHeight / Math.ceil(itemCount / cols);
      const cellHeight = Math.min(baseHeight * heightMultiplier, usableHeight * 0.5);

      // Find column with least height
      const colIndex = colHeights.indexOf(Math.min(...colHeights));

      cells.push({
        index: i,
        rank,
        x: padding + colIndex * (colWidth + gap),
        y: padding + colHeights[colIndex],
        width: colWidth,
        height: cellHeight,
        zIndex: itemCount - i,
        emphasis: rank <= emphasizeTop ? 'high' : rank <= emphasizeTop * 2 ? 'medium' : 'low',
        showLabel: opts.showLabels,
        labelPosition: 'overlay',
      });

      colHeights[colIndex] += cellHeight + gap;
    }

    return cells;
  }

  /**
   * Timeline layout - horizontal arrangement
   */
  private generateTimelineCells(itemCount: number, opts: Required<LayoutOptions>): LayoutCell[] {
    const cells: LayoutCell[] = [];
    const { targetWidth, targetHeight, padding, gap, emphasizeTop } = opts;

    const usableWidth = targetWidth - 2 * padding;
    const usableHeight = targetHeight - 2 * padding;

    const cellWidth = (usableWidth - (itemCount - 1) * gap) / itemCount;
    const maxCellWidth = usableHeight * 0.8;
    const actualCellWidth = Math.min(cellWidth, maxCellWidth);

    for (let i = 0; i < itemCount; i++) {
      const rank = i + 1;
      const heightMultiplier = rank <= emphasizeTop ? 1 : 0.8;
      const cellHeight = usableHeight * heightMultiplier;
      const yOffset = (usableHeight - cellHeight) / 2;

      cells.push({
        index: i,
        rank,
        x: padding + i * (actualCellWidth + gap),
        y: padding + yOffset,
        width: actualCellWidth,
        height: cellHeight,
        zIndex: itemCount - i,
        emphasis: rank <= emphasizeTop ? 'high' : rank <= emphasizeTop * 2 ? 'medium' : 'low',
        showLabel: opts.showLabels,
        labelPosition: 'bottom',
      });
    }

    return cells;
  }

  /**
   * Cascade layout - overlapping cards
   */
  private generateCascadeCells(itemCount: number, opts: Required<LayoutOptions>): LayoutCell[] {
    const cells: LayoutCell[] = [];
    const { targetWidth, targetHeight, padding, emphasizeTop } = opts;

    const usableWidth = targetWidth - 2 * padding;
    const usableHeight = targetHeight - 2 * padding;

    // Cards get progressively smaller and offset
    const baseWidth = usableWidth * 0.4;
    const baseHeight = usableHeight * 0.7;
    const offsetX = (usableWidth - baseWidth) / (itemCount - 1 || 1);
    const offsetY = (usableHeight - baseHeight) / (itemCount - 1 || 1);
    const scaleStep = 0.05;

    for (let i = 0; i < itemCount; i++) {
      const rank = i + 1;
      const scale = 1 - i * scaleStep;
      const width = baseWidth * scale;
      const height = baseHeight * scale;

      cells.push({
        index: i,
        rank,
        x: padding + i * offsetX,
        y: padding + i * offsetY,
        width,
        height,
        zIndex: itemCount - i,
        scale,
        rotation: (i % 2 === 0 ? 1 : -1) * (i * 2),
        emphasis: rank <= emphasizeTop ? 'high' : rank <= emphasizeTop * 2 ? 'medium' : 'low',
        showLabel: opts.showLabels,
        labelPosition: 'overlay',
      });
    }

    return cells;
  }

  /**
   * Compact layout - dense grid for many items
   */
  private generateCompactCells(itemCount: number, opts: Required<LayoutOptions>): LayoutCell[] {
    const cells: LayoutCell[] = [];
    const { targetWidth, targetHeight, padding, emphasizeTop } = opts;

    const usableWidth = targetWidth - 2 * padding;
    const usableHeight = targetHeight - 2 * padding;

    // More columns for compact layout
    const cols = Math.ceil(Math.sqrt(itemCount * 1.5));
    const rows = Math.ceil(itemCount / cols);
    const cellGap = 4;
    const cellWidth = (usableWidth - (cols - 1) * cellGap) / cols;
    const cellHeight = (usableHeight - (rows - 1) * cellGap) / rows;

    for (let i = 0; i < itemCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const rank = i + 1;

      cells.push({
        index: i,
        rank,
        x: padding + col * (cellWidth + cellGap),
        y: padding + row * (cellHeight + cellGap),
        width: cellWidth,
        height: cellHeight,
        zIndex: 1,
        emphasis: rank <= emphasizeTop ? 'high' : 'low',
        showLabel: false, // Too compact for labels
        labelPosition: 'none',
      });
    }

    return cells;
  }

  /**
   * Calculate visual balance score for a layout
   */
  private calculateVisualBalance(cells: LayoutCell[], opts: Required<LayoutOptions>): number {
    if (cells.length === 0) return 1;

    const centerX = opts.targetWidth / 2;
    const centerY = opts.targetHeight / 2;

    // Calculate center of mass
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (const cell of cells) {
      const weight = cell.width * cell.height;
      const cellCenterX = cell.x + cell.width / 2;
      const cellCenterY = cell.y + cell.height / 2;

      weightedX += cellCenterX * weight;
      weightedY += cellCenterY * weight;
      totalWeight += weight;
    }

    const massX = weightedX / totalWeight;
    const massY = weightedY / totalWeight;

    // Distance from center (normalized)
    const distanceFromCenter = Math.sqrt(
      Math.pow((massX - centerX) / centerX, 2) +
      Math.pow((massY - centerY) / centerY, 2)
    );

    // Balance score (1 = perfect, 0 = completely off)
    return Math.max(0, 1 - distanceFromCenter);
  }

  /**
   * Estimate image quality from items
   */
  private estimateImageQuality(items: LayoutItem[]): 'low' | 'medium' | 'high' {
    const withImages = items.filter(item => item.imageUrl);
    if (withImages.length === 0) return 'low';
    if (withImages.length < items.length * 0.5) return 'medium';
    return 'high';
  }

  /**
   * Get complexity level for a layout
   */
  private getComplexity(type: LayoutType, itemCount: number): 'simple' | 'moderate' | 'complex' {
    if (type === 'compact' || type === 'grid') {
      return itemCount > 20 ? 'complex' : itemCount > 10 ? 'moderate' : 'simple';
    }
    if (type === 'cascade' || type === 'masonry') {
      return 'complex';
    }
    return 'moderate';
  }

  /**
   * Suggest optimal layouts for given items
   */
  suggestLayouts(items: LayoutItem[], opts: Partial<LayoutOptions> = {}): LayoutType[] {
    const options = { ...this.options, ...opts };
    const criteria: AutoLayoutCriteria = {
      itemCount: items.length,
      hasImages: items.some(item => item.imageUrl),
      imageQuality: this.estimateImageQuality(items),
      targetAspectRatio: options.targetWidth / options.targetHeight,
    };

    // Score all layouts and sort by score
    const scored = Object.entries(LAYOUT_SCORES)
      .map(([layout, scoreFn]) => ({
        layout: layout as LayoutType,
        score: scoreFn(criteria),
      }))
      .sort((a, b) => b.score - a.score);

    // Return top 3 suggestions
    return scored.slice(0, 3).map(s => s.layout);
  }
}

/**
 * Create a layout engine with default options
 */
export function createLayoutEngine(options?: Partial<LayoutOptions>): LayoutEngine {
  return new LayoutEngine(options);
}
