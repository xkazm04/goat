/**
 * BalanceOptimizer
 * Visual weight distribution and balance analysis
 * Ensures aesthetically pleasing compositions
 */

import type {
  Layout,
  LayoutCell,
  VisualWeight,
  BalanceAnalysis,
  BalanceSuggestion,
  ExtractedColors,
} from './types';

/**
 * Default weights for visual balance calculation
 */
const BALANCE_WEIGHTS = {
  area: 0.4,      // Size contributes to weight
  position: 0.2,  // Position from center matters
  color: 0.25,   // Dark/saturated colors are heavier
  contrast: 0.15, // High contrast areas draw attention
};

/**
 * BalanceOptimizer class
 */
export class BalanceOptimizer {
  private readonly targetWidth: number;
  private readonly targetHeight: number;

  constructor(targetWidth: number, targetHeight: number) {
    this.targetWidth = targetWidth;
    this.targetHeight = targetHeight;
  }

  /**
   * Analyze the visual balance of a layout
   */
  analyzeBalance(
    layout: Layout,
    colors?: Map<number, ExtractedColors>
  ): BalanceAnalysis {
    const weights = this.calculateAllWeights(layout.cells, colors);
    const centerOfMass = this.calculateCenterOfMass(weights);
    const symmetryScore = this.calculateSymmetry(layout.cells);
    const distributionScore = this.calculateDistribution(layout.cells);
    const overallBalance = this.calculateOverallBalance(centerOfMass, symmetryScore, distributionScore);
    const suggestions = this.generateSuggestions(layout, weights, centerOfMass, symmetryScore);

    return {
      centerOfMass,
      symmetryScore,
      distributionScore,
      overallBalance,
      suggestions,
    };
  }

  /**
   * Calculate visual weights for all cells
   */
  private calculateAllWeights(
    cells: LayoutCell[],
    colors?: Map<number, ExtractedColors>
  ): VisualWeight[] {
    return cells.map((cell, index) => {
      const area = cell.width * cell.height;
      const normalizedArea = area / (this.targetWidth * this.targetHeight);

      const cellColors = colors?.get(index);
      const colorWeight = cellColors
        ? this.calculateColorWeight(cellColors)
        : 0.5;

      const contrastWeight = this.estimateContrastWeight(cell, cells);

      const totalWeight =
        normalizedArea * BALANCE_WEIGHTS.area +
        colorWeight * BALANCE_WEIGHTS.color +
        contrastWeight * BALANCE_WEIGHTS.contrast;

      return {
        position: {
          x: cell.x + cell.width / 2,
          y: cell.y + cell.height / 2,
        },
        weight: totalWeight,
        area: normalizedArea,
        colorWeight,
        contrastWeight,
      };
    });
  }

  /**
   * Calculate color weight based on darkness and saturation
   */
  private calculateColorWeight(colors: ExtractedColors): number {
    // Dark and saturated colors appear heavier
    const dominant = colors.dominant;
    const { lightness, saturation } = this.hexToHSL(dominant);

    // Invert lightness (darker = heavier)
    const darknessWeight = 1 - lightness;
    // Saturation adds visual weight
    const saturationWeight = saturation;

    return (darknessWeight * 0.6 + saturationWeight * 0.4);
  }

  /**
   * Estimate contrast weight based on position and emphasis
   */
  private estimateContrastWeight(cell: LayoutCell, allCells: LayoutCell[]): number {
    // Higher emphasis = higher contrast weight
    const emphasisWeight = {
      high: 1.0,
      medium: 0.6,
      low: 0.3,
    };

    // Isolated cells have more visual weight
    const avgDistance = this.calculateAverageDistance(cell, allCells);
    const isolationWeight = Math.min(avgDistance / 200, 1);

    return emphasisWeight[cell.emphasis] * 0.7 + isolationWeight * 0.3;
  }

  /**
   * Calculate average distance from other cells
   */
  private calculateAverageDistance(cell: LayoutCell, allCells: LayoutCell[]): number {
    if (allCells.length <= 1) return 0;

    const cellCenter = {
      x: cell.x + cell.width / 2,
      y: cell.y + cell.height / 2,
    };

    let totalDistance = 0;
    let count = 0;

    for (const other of allCells) {
      if (other.index === cell.index) continue;

      const otherCenter = {
        x: other.x + other.width / 2,
        y: other.y + other.height / 2,
      };

      const distance = Math.sqrt(
        Math.pow(cellCenter.x - otherCenter.x, 2) +
        Math.pow(cellCenter.y - otherCenter.y, 2)
      );

      totalDistance += distance;
      count++;
    }

    return count > 0 ? totalDistance / count : 0;
  }

  /**
   * Calculate center of mass from visual weights
   */
  private calculateCenterOfMass(weights: VisualWeight[]): { x: number; y: number } {
    if (weights.length === 0) {
      return { x: this.targetWidth / 2, y: this.targetHeight / 2 };
    }

    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (const w of weights) {
      weightedX += w.position.x * w.weight;
      weightedY += w.position.y * w.weight;
      totalWeight += w.weight;
    }

    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
    };
  }

  /**
   * Calculate symmetry score (0-1)
   */
  private calculateSymmetry(cells: LayoutCell[]): number {
    if (cells.length === 0) return 1;

    const centerX = this.targetWidth / 2;
    const centerY = this.targetHeight / 2;

    let horizontalSymmetry = 0;
    let verticalSymmetry = 0;

    for (const cell of cells) {
      const cellCenterX = cell.x + cell.width / 2;
      const cellCenterY = cell.y + cell.height / 2;

      // Find mirror position
      const mirrorX = 2 * centerX - cellCenterX;
      const mirrorY = 2 * centerY - cellCenterY;

      // Check if there's a similar cell at mirror position
      const horizontalMatch = cells.find(other =>
        other.index !== cell.index &&
        Math.abs((other.x + other.width / 2) - mirrorX) < cell.width * 0.5 &&
        Math.abs((other.y + other.height / 2) - cellCenterY) < cell.height * 0.5 &&
        Math.abs(other.width - cell.width) < cell.width * 0.3
      );

      const verticalMatch = cells.find(other =>
        other.index !== cell.index &&
        Math.abs((other.x + other.width / 2) - cellCenterX) < cell.width * 0.5 &&
        Math.abs((other.y + other.height / 2) - mirrorY) < cell.height * 0.5 &&
        Math.abs(other.height - cell.height) < cell.height * 0.3
      );

      if (horizontalMatch) horizontalSymmetry++;
      if (verticalMatch) verticalSymmetry++;
    }

    const maxMatches = cells.length;
    return (
      (horizontalSymmetry / maxMatches) * 0.5 +
      (verticalSymmetry / maxMatches) * 0.5
    );
  }

  /**
   * Calculate distribution score (how evenly spread)
   */
  private calculateDistribution(cells: LayoutCell[]): number {
    if (cells.length <= 1) return 1;

    // Divide canvas into quadrants
    const quadrants = [0, 0, 0, 0]; // TL, TR, BL, BR
    const centerX = this.targetWidth / 2;
    const centerY = this.targetHeight / 2;

    for (const cell of cells) {
      const cellCenterX = cell.x + cell.width / 2;
      const cellCenterY = cell.y + cell.height / 2;

      const quadIndex =
        (cellCenterX >= centerX ? 1 : 0) +
        (cellCenterY >= centerY ? 2 : 0);

      quadrants[quadIndex]++;
    }

    // Calculate evenness (entropy-like measure)
    const total = cells.length;
    const expected = total / 4;
    let deviation = 0;

    for (const count of quadrants) {
      deviation += Math.abs(count - expected);
    }

    // Normalize: 0 deviation = 1, max deviation = 0
    const maxDeviation = total;
    return 1 - (deviation / maxDeviation);
  }

  /**
   * Calculate overall balance score
   */
  private calculateOverallBalance(
    centerOfMass: { x: number; y: number },
    symmetryScore: number,
    distributionScore: number
  ): number {
    // How far is center of mass from actual center?
    const idealCenter = { x: this.targetWidth / 2, y: this.targetHeight / 2 };
    const distance = Math.sqrt(
      Math.pow(centerOfMass.x - idealCenter.x, 2) +
      Math.pow(centerOfMass.y - idealCenter.y, 2)
    );
    const maxDistance = Math.sqrt(
      Math.pow(this.targetWidth / 2, 2) +
      Math.pow(this.targetHeight / 2, 2)
    );
    const centerScore = 1 - (distance / maxDistance);

    // Weighted combination
    return (
      centerScore * 0.4 +
      symmetryScore * 0.3 +
      distributionScore * 0.3
    );
  }

  /**
   * Generate suggestions to improve balance
   */
  private generateSuggestions(
    layout: Layout,
    weights: VisualWeight[],
    centerOfMass: { x: number; y: number },
    symmetryScore: number
  ): BalanceSuggestion[] {
    const suggestions: BalanceSuggestion[] = [];
    const idealCenter = { x: this.targetWidth / 2, y: this.targetHeight / 2 };

    // Check if center of mass is off
    const xOffset = centerOfMass.x - idealCenter.x;
    const yOffset = centerOfMass.y - idealCenter.y;

    if (Math.abs(xOffset) > this.targetWidth * 0.1) {
      // Find heaviest element on the heavy side
      const heavySide = xOffset > 0 ? 'right' : 'left';
      const heaviestOnSide = weights
        .filter(w => (heavySide === 'right' ? w.position.x > idealCenter.x : w.position.x < idealCenter.x))
        .sort((a, b) => b.weight - a.weight)[0];

      if (heaviestOnSide) {
        const cellIndex = weights.indexOf(heaviestOnSide);
        suggestions.push({
          type: 'move',
          target: cellIndex,
          description: `Move item ${cellIndex + 1} towards center to improve horizontal balance`,
          improvement: 0.15,
          params: {
            direction: heavySide === 'right' ? 'left' : 'right',
            amount: Math.abs(xOffset) * 0.5,
          },
        });
      }
    }

    if (Math.abs(yOffset) > this.targetHeight * 0.1) {
      const heavySide = yOffset > 0 ? 'bottom' : 'top';
      const heaviestOnSide = weights
        .filter(w => (heavySide === 'bottom' ? w.position.y > idealCenter.y : w.position.y < idealCenter.y))
        .sort((a, b) => b.weight - a.weight)[0];

      if (heaviestOnSide) {
        const cellIndex = weights.indexOf(heaviestOnSide);
        suggestions.push({
          type: 'move',
          target: cellIndex,
          description: `Move item ${cellIndex + 1} towards center to improve vertical balance`,
          improvement: 0.15,
          params: {
            direction: heavySide === 'bottom' ? 'up' : 'down',
            amount: Math.abs(yOffset) * 0.5,
          },
        });
      }
    }

    // Symmetry suggestions
    if (symmetryScore < 0.5 && layout.cells.length >= 4) {
      suggestions.push({
        type: 'reorder',
        target: -1,
        description: 'Consider a more symmetric layout arrangement',
        improvement: 0.2,
      });
    }

    // Size variation suggestions
    const sizes = layout.cells.map(c => c.width * c.height);
    const sizeVariance = this.calculateVariance(sizes);
    const normalizedVariance = sizeVariance / Math.pow(Math.max(...sizes), 2);

    if (normalizedVariance < 0.01 && layout.cells.length > 3) {
      suggestions.push({
        type: 'resize',
        target: 0,
        description: 'Add size variation to create visual hierarchy',
        improvement: 0.1,
      });
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Optimize a layout for better balance
   */
  optimizeLayout(layout: Layout, iterations: number = 5): Layout {
    let currentLayout = { ...layout };
    let currentBalance = this.analyzeBalance(currentLayout);

    for (let i = 0; i < iterations; i++) {
      if (currentBalance.overallBalance >= 0.9) break;

      const improved = this.applyBestSuggestion(currentLayout, currentBalance.suggestions);
      if (!improved) break;

      const newBalance = this.analyzeBalance(improved);
      if (newBalance.overallBalance > currentBalance.overallBalance) {
        currentLayout = improved;
        currentBalance = newBalance;
      } else {
        break; // No improvement
      }
    }

    return currentLayout;
  }

  /**
   * Apply the best suggestion to improve layout
   */
  private applyBestSuggestion(
    layout: Layout,
    suggestions: BalanceSuggestion[]
  ): Layout | null {
    if (suggestions.length === 0) return null;

    const best = suggestions[0];
    const cells = [...layout.cells];

    switch (best.type) {
      case 'move': {
        if (best.target < 0 || best.target >= cells.length) return null;
        const cell = { ...cells[best.target] };
        const params = best.params as { direction: string; amount: number };

        switch (params.direction) {
          case 'left':
            cell.x = Math.max(0, cell.x - params.amount);
            break;
          case 'right':
            cell.x = Math.min(this.targetWidth - cell.width, cell.x + params.amount);
            break;
          case 'up':
            cell.y = Math.max(0, cell.y - params.amount);
            break;
          case 'down':
            cell.y = Math.min(this.targetHeight - cell.height, cell.y + params.amount);
            break;
        }

        cells[best.target] = cell;
        break;
      }
      case 'resize': {
        // Not implementing resize in optimization as it can break layouts
        return null;
      }
      case 'reorder': {
        // Not implementing reorder as it changes semantic meaning
        return null;
      }
      default:
        return null;
    }

    return { ...layout, cells };
  }

  /**
   * Calculate variance of an array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  /**
   * Convert hex color to HSL
   */
  private hexToHSL(hex: string): { hue: number; saturation: number; lightness: number } {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse RGB
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { hue: h, saturation: s, lightness: l };
  }
}

/**
 * Create a balance optimizer instance
 */
export function createBalanceOptimizer(width: number, height: number): BalanceOptimizer {
  return new BalanceOptimizer(width, height);
}
