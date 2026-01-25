/**
 * JenksBreaks
 * Jenks Natural Breaks (Fisher-Jenks) algorithm implementation
 * Finds natural groupings in data by minimizing variance within classes
 * and maximizing variance between classes
 */

import type { JenksBreak, JenksConfig, AlgorithmResult } from './types';

/**
 * Default Jenks configuration
 */
const DEFAULT_JENKS_CONFIG: JenksConfig = {
  algorithm: 'jenks',
  tierCount: 5,
  minGVF: 0.8, // Minimum Goodness of Variance Fit
};

/**
 * JenksBreaks class
 * Implements the Jenks Natural Breaks optimization algorithm
 */
export class JenksBreaks {
  private config: JenksConfig;
  private data: number[] = [];
  private breaks: number[] = [];
  private gvf: number = 0;

  constructor(config: Partial<JenksConfig> = {}) {
    this.config = { ...DEFAULT_JENKS_CONFIG, ...config };
  }

  /**
   * Set data for analysis
   */
  setData(data: number[]): void {
    this.data = [...data].sort((a, b) => a - b);
  }

  /**
   * Calculate sum of squared deviations from mean (SDAM)
   */
  private calculateSDAM(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  }

  /**
   * Calculate sum of squared deviations from class means (SDCM)
   */
  private calculateSDCM(breaks: number[]): number {
    let sdcm = 0;
    let prevBreak = 0;

    for (const brk of breaks) {
      const classData = this.data.slice(prevBreak, brk);
      sdcm += this.calculateSDAM(classData);
      prevBreak = brk;
    }

    // Add last class
    const lastClass = this.data.slice(prevBreak);
    sdcm += this.calculateSDAM(lastClass);

    return sdcm;
  }

  /**
   * Calculate Goodness of Variance Fit (GVF)
   * GVF = (SDAM - SDCM) / SDAM
   * Values range from 0 to 1, higher is better
   */
  calculateGVF(breaks: number[]): number {
    const sdam = this.calculateSDAM(this.data);
    if (sdam === 0) return 1; // Perfect fit if no variance

    const sdcm = this.calculateSDCM(breaks);
    return (sdam - sdcm) / sdam;
  }

  /**
   * Find optimal breaks using dynamic programming approach
   * Based on the Fisher-Jenks algorithm
   */
  findBreaks(numClasses?: number): number[] {
    const k = numClasses || this.config.tierCount;
    const n = this.data.length;

    if (n === 0 || k <= 1) {
      return [n];
    }

    if (k >= n) {
      // More classes than data points
      return Array.from({ length: n }, (_, i) => i + 1);
    }

    // Initialize matrices
    // mat1[i][j] = minimum variance achievable with j classes for first i values
    // mat2[i][j] = index of last break for optimal solution
    const mat1: number[][] = Array(n + 1).fill(null).map(() => Array(k + 1).fill(Infinity));
    const mat2: number[][] = Array(n + 1).fill(null).map(() => Array(k + 1).fill(0));

    // Base case: 1 class
    for (let i = 1; i <= n; i++) {
      mat1[i][1] = this.calculateSDAM(this.data.slice(0, i));
      mat2[i][1] = 1;
    }

    // Fill matrices using dynamic programming
    for (let numClass = 2; numClass <= k; numClass++) {
      for (let i = numClass; i <= n; i++) {
        for (let j = numClass - 1; j < i; j++) {
          const cost = mat1[j][numClass - 1] + this.calculateSDAM(this.data.slice(j, i));

          if (cost < mat1[i][numClass]) {
            mat1[i][numClass] = cost;
            mat2[i][numClass] = j;
          }
        }
      }
    }

    // Backtrack to find breaks
    const breaks: number[] = [];
    let idx = n;

    for (let c = k; c > 1; c--) {
      breaks.unshift(mat2[idx][c]);
      idx = mat2[idx][c];
    }

    // Add final break
    breaks.push(n);

    this.breaks = breaks;
    this.gvf = this.calculateGVF(breaks.slice(0, -1));

    return breaks;
  }

  /**
   * Find optimal number of classes based on GVF threshold
   */
  findOptimalClasses(maxClasses: number = 10): number {
    let optimalK = 2;

    for (let k = 2; k <= Math.min(maxClasses, this.data.length); k++) {
      const breaks = this.findBreaks(k);
      const gvf = this.calculateGVF(breaks.slice(0, -1));

      if (gvf >= this.config.minGVF) {
        optimalK = k;
        break;
      }

      // If GVF improvement is marginal, stop
      if (k > 2) {
        const prevBreaks = this.findBreaks(k - 1);
        const prevGVF = this.calculateGVF(prevBreaks.slice(0, -1));

        if (gvf - prevGVF < 0.05) {
          optimalK = k - 1;
          break;
        }
      }

      optimalK = k;
    }

    return optimalK;
  }

  /**
   * Get break values from indices
   */
  getBreakValues(): JenksBreak[] {
    const breakValues: JenksBreak[] = [];

    for (let i = 0; i < this.breaks.length - 1; i++) {
      const breakIdx = this.breaks[i];
      if (breakIdx > 0 && breakIdx < this.data.length) {
        // Break value is between data[breakIdx-1] and data[breakIdx]
        const value = (this.data[breakIdx - 1] + this.data[breakIdx]) / 2;
        breakValues.push({
          value,
          goodness: this.gvf,
        });
      }
    }

    return breakValues;
  }

  /**
   * Calculate tier boundaries for a list
   */
  calculateBoundaries(listSize: number): number[] {
    if (this.data.length === 0) {
      // Generate evenly spaced boundaries
      const boundaries = [0];
      const tierSize = Math.ceil(listSize / this.config.tierCount);
      for (let i = 1; i < this.config.tierCount; i++) {
        boundaries.push(Math.min(i * tierSize, listSize));
      }
      boundaries.push(listSize);
      return boundaries;
    }

    const breaks = this.findBreaks();

    // Convert data indices to list positions
    const boundaries = [0];

    for (const brk of breaks) {
      const position = Math.round((brk / this.data.length) * listSize);
      if (position > boundaries[boundaries.length - 1] && position < listSize) {
        boundaries.push(position);
      }
    }

    // Ensure we end at listSize
    if (boundaries[boundaries.length - 1] !== listSize) {
      boundaries.push(listSize);
    }

    return boundaries;
  }

  /**
   * Calculate algorithm result
   */
  calculate(listSize: number): AlgorithmResult {
    const startTime = performance.now();

    // Find breaks
    const breaks = this.findBreaks();
    const boundaries = this.calculateBoundaries(listSize);

    const endTime = performance.now();

    return {
      algorithm: 'jenks',
      boundaries,
      confidence: Math.round(this.gvf * 100),
      executionTime: endTime - startTime,
      metadata: {
        gvf: this.gvf,
        breaks: this.getBreakValues(),
        dataPoints: this.data.length,
        classCount: this.config.tierCount,
      },
    };
  }

  /**
   * Get class assignments for each data point
   */
  getClassAssignments(): number[] {
    if (this.breaks.length === 0) {
      this.findBreaks();
    }

    const assignments: number[] = [];
    let classIdx = 0;
    let nextBreak = this.breaks[0] || this.data.length;

    for (let i = 0; i < this.data.length; i++) {
      while (i >= nextBreak && classIdx < this.breaks.length - 1) {
        classIdx++;
        nextBreak = this.breaks[classIdx];
      }
      assignments.push(classIdx);
    }

    return assignments;
  }

  /**
   * Get class statistics
   */
  getClassStats(): Array<{
    classIndex: number;
    count: number;
    min: number;
    max: number;
    mean: number;
    variance: number;
  }> {
    const assignments = this.getClassAssignments();
    const classes: Map<number, number[]> = new Map();

    // Group data by class
    for (let i = 0; i < this.data.length; i++) {
      const classIdx = assignments[i];
      if (!classes.has(classIdx)) {
        classes.set(classIdx, []);
      }
      classes.get(classIdx)!.push(this.data[i]);
    }

    // Calculate stats for each class
    return Array.from(classes.entries()).map(([classIndex, values]) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

      return {
        classIndex,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        mean,
        variance,
      };
    }).sort((a, b) => a.classIndex - b.classIndex);
  }

  /**
   * Get current GVF
   */
  getGVF(): number {
    return this.gvf;
  }

  /**
   * Reset the algorithm
   */
  reset(): void {
    this.data = [];
    this.breaks = [];
    this.gvf = 0;
  }
}

/**
 * Create Jenks breaks calculator
 */
export function createJenksBreaks(config?: Partial<JenksConfig>): JenksBreaks {
  return new JenksBreaks(config);
}

// Singleton instance
let jenksInstance: JenksBreaks | null = null;

/**
 * Get or create Jenks breaks instance
 */
export function getJenksBreaks(config?: Partial<JenksConfig>): JenksBreaks {
  if (!jenksInstance) {
    jenksInstance = new JenksBreaks(config);
  }
  return jenksInstance;
}
