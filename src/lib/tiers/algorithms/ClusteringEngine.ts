/**
 * ClusteringEngine
 * K-means clustering implementation for natural tier groupings
 */

import type { Cluster, KMeansConfig, AlgorithmResult } from './types';

/**
 * Default k-means configuration
 */
const DEFAULT_KMEANS_CONFIG: KMeansConfig = {
  algorithm: 'kmeans',
  tierCount: 5,
  maxIterations: 100,
  convergenceThreshold: 0.001,
  initMethod: 'kmeans++',
};

/**
 * ClusteringEngine class
 * Implements k-means clustering for tier boundary detection
 */
export class ClusteringEngine {
  private config: KMeansConfig;
  private clusters: Cluster[] = [];
  private data: number[] = [];

  constructor(config: Partial<KMeansConfig> = {}) {
    this.config = { ...DEFAULT_KMEANS_CONFIG, ...config };
  }

  /**
   * Set data points for clustering
   */
  setData(data: number[]): void {
    this.data = [...data].sort((a, b) => a - b);
  }

  /**
   * Initialize centroids using k-means++ algorithm
   */
  private initializeCentroidsKMeansPP(k: number): number[] {
    if (this.data.length === 0) return [];

    const centroids: number[] = [];

    // First centroid: random from data
    const firstIdx = Math.floor(Math.random() * this.data.length);
    centroids.push(this.data[firstIdx]);

    // Remaining centroids: weighted probability based on distance
    while (centroids.length < k) {
      const distances = this.data.map((point) => {
        const minDist = Math.min(...centroids.map((c) => Math.pow(point - c, 2)));
        return minDist;
      });

      const totalDist = distances.reduce((a, b) => a + b, 0);
      if (totalDist === 0) break;

      // Weighted random selection
      let random = Math.random() * totalDist;
      for (let i = 0; i < distances.length; i++) {
        random -= distances[i];
        if (random <= 0) {
          centroids.push(this.data[i]);
          break;
        }
      }
    }

    return centroids.sort((a, b) => a - b);
  }

  /**
   * Initialize centroids using quantile method
   */
  private initializeCentroidsQuantile(k: number): number[] {
    if (this.data.length === 0) return [];

    const centroids: number[] = [];
    for (let i = 0; i < k; i++) {
      const idx = Math.floor(((i + 0.5) / k) * this.data.length);
      centroids.push(this.data[idx]);
    }

    return centroids;
  }

  /**
   * Initialize centroids based on config method
   */
  private initializeCentroids(k: number): number[] {
    switch (this.config.initMethod) {
      case 'kmeans++':
        return this.initializeCentroidsKMeansPP(k);
      case 'quantile':
        return this.initializeCentroidsQuantile(k);
      case 'random':
      default:
        // Random selection
        const indices = new Set<number>();
        while (indices.size < k && indices.size < this.data.length) {
          indices.add(Math.floor(Math.random() * this.data.length));
        }
        return Array.from(indices)
          .map((i) => this.data[i])
          .sort((a, b) => a - b);
    }
  }

  /**
   * Assign data points to nearest centroid
   */
  private assignToClusters(centroids: number[]): Cluster[] {
    const clusters: Cluster[] = centroids.map((centroid) => ({
      centroid,
      items: [],
      variance: 0,
    }));

    for (const point of this.data) {
      let nearestIdx = 0;
      let nearestDist = Math.abs(point - centroids[0]);

      for (let c = 1; c < centroids.length; c++) {
        const dist = Math.abs(point - centroids[c]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = c;
        }
      }

      clusters[nearestIdx].items.push(point);
    }

    return clusters;
  }

  /**
   * Calculate cluster variance
   */
  private calculateClusterVariance(cluster: Cluster): number {
    if (cluster.items.length === 0) return 0;

    const mean = cluster.centroid;
    return cluster.items.reduce((sum, point) => sum + Math.pow(point - mean, 2), 0) / cluster.items.length;
  }

  /**
   * Update centroids based on cluster means
   */
  private updateCentroids(clusters: Cluster[]): number[] {
    return clusters.map((cluster) => {
      if (cluster.items.length === 0) return cluster.centroid;
      return cluster.items.reduce((sum, point) => sum + point, 0) / cluster.items.length;
    });
  }

  /**
   * Check if centroids have converged
   */
  private hasConverged(oldCentroids: number[], newCentroids: number[]): boolean {
    const threshold = this.config.convergenceThreshold || 0.001;
    const range = Math.max(...this.data) - Math.min(...this.data);
    const normalizedThreshold = threshold * range;

    for (let i = 0; i < oldCentroids.length; i++) {
      if (Math.abs(oldCentroids[i] - newCentroids[i]) > normalizedThreshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Run k-means clustering
   */
  cluster(k?: number): Cluster[] {
    const numClusters = k || this.config.tierCount;

    if (this.data.length === 0) {
      return [];
    }

    if (this.data.length <= numClusters) {
      // Not enough data for clustering, return one cluster per point
      return this.data.map((point) => ({
        centroid: point,
        items: [point],
        variance: 0,
      }));
    }

    // Initialize centroids
    let centroids = this.initializeCentroids(numClusters);

    // Iterative refinement
    let iterations = 0;
    let converged = false;

    while (!converged && iterations < this.config.maxIterations) {
      // Assign points to clusters
      const clusters = this.assignToClusters(centroids);

      // Update centroids
      const newCentroids = this.updateCentroids(clusters);

      // Check convergence
      converged = this.hasConverged(centroids, newCentroids);
      centroids = newCentroids;
      iterations++;
    }

    // Final clustering with variance calculation
    this.clusters = this.assignToClusters(centroids);
    this.clusters.forEach((cluster) => {
      cluster.variance = this.calculateClusterVariance(cluster);
    });

    return this.clusters;
  }

  /**
   * Calculate boundaries from clusters
   * Boundaries are midpoints between adjacent cluster centroids
   */
  calculateBoundaries(listSize: number): number[] {
    if (this.clusters.length === 0) {
      this.cluster();
    }

    if (this.clusters.length === 0) {
      return [0, listSize];
    }

    // Sort clusters by centroid
    const sortedClusters = [...this.clusters].sort((a, b) => a.centroid - b.centroid);

    const boundaries: number[] = [0];

    // Calculate boundary positions based on data distribution
    let cumulativeItems = 0;
    for (let i = 0; i < sortedClusters.length - 1; i++) {
      cumulativeItems += sortedClusters[i].items.length;

      // Use the count of items as the boundary position
      boundaries.push(cumulativeItems);
    }

    boundaries.push(listSize);

    return boundaries;
  }

  /**
   * Calculate silhouette score for clustering quality
   * Values range from -1 to 1, higher is better
   */
  calculateSilhouetteScore(): number {
    if (this.clusters.length < 2 || this.data.length < 2) {
      return 0;
    }

    let totalScore = 0;
    let count = 0;

    for (let c = 0; c < this.clusters.length; c++) {
      const cluster = this.clusters[c];

      for (const point of cluster.items) {
        // a(i): average distance to other points in same cluster
        let a = 0;
        if (cluster.items.length > 1) {
          a = cluster.items
            .filter((p) => p !== point)
            .reduce((sum, p) => sum + Math.abs(point - p), 0) / (cluster.items.length - 1);
        }

        // b(i): minimum average distance to points in other clusters
        let b = Infinity;
        for (let other = 0; other < this.clusters.length; other++) {
          if (other === c || this.clusters[other].items.length === 0) continue;

          const avgDist = this.clusters[other].items.reduce(
            (sum, p) => sum + Math.abs(point - p), 0
          ) / this.clusters[other].items.length;

          b = Math.min(b, avgDist);
        }

        if (b === Infinity) b = 0;

        // Silhouette coefficient for this point
        const s = a === 0 && b === 0 ? 0 : (b - a) / Math.max(a, b);
        totalScore += s;
        count++;
      }
    }

    return count > 0 ? totalScore / count : 0;
  }

  /**
   * Calculate total within-cluster sum of squares (WCSS)
   */
  calculateWCSS(): number {
    return this.clusters.reduce((total, cluster) => {
      return total + cluster.items.reduce(
        (sum, point) => sum + Math.pow(point - cluster.centroid, 2), 0
      );
    }, 0);
  }

  /**
   * Calculate algorithm result
   */
  calculate(listSize: number): AlgorithmResult {
    const startTime = performance.now();

    // Run clustering
    this.cluster();

    // Calculate boundaries
    const boundaries = this.calculateBoundaries(listSize);

    // Calculate quality metrics
    const silhouette = this.calculateSilhouetteScore();
    const wcss = this.calculateWCSS();

    const endTime = performance.now();

    // Confidence based on silhouette score (normalized to 0-100)
    const confidence = Math.max(0, Math.min(100, (silhouette + 1) / 2 * 100));

    return {
      algorithm: 'kmeans',
      boundaries,
      confidence: Math.round(confidence),
      executionTime: endTime - startTime,
      metadata: {
        clusters: this.clusters,
        silhouetteScore: silhouette,
        wcss,
        iterations: this.config.maxIterations,
        convergence: true,
        clusterSizes: this.clusters.map((c) => c.items.length),
      },
    };
  }

  /**
   * Find optimal number of clusters using elbow method
   */
  findOptimalK(maxK: number = 10): number {
    const wcssValues: number[] = [];

    for (let k = 1; k <= Math.min(maxK, this.data.length); k++) {
      this.cluster(k);
      wcssValues.push(this.calculateWCSS());
    }

    // Find elbow point using second derivative
    if (wcssValues.length < 3) {
      return Math.min(this.config.tierCount, wcssValues.length);
    }

    let maxSecondDerivative = 0;
    let optimalK = 1;

    for (let i = 1; i < wcssValues.length - 1; i++) {
      const secondDerivative = wcssValues[i - 1] - 2 * wcssValues[i] + wcssValues[i + 1];
      if (secondDerivative > maxSecondDerivative) {
        maxSecondDerivative = secondDerivative;
        optimalK = i + 1;
      }
    }

    return optimalK;
  }

  /**
   * Get cluster containing a specific value
   */
  getClusterForValue(value: number): Cluster | null {
    for (const cluster of this.clusters) {
      if (cluster.items.includes(value)) {
        return cluster;
      }
    }

    // Find nearest cluster
    let nearest: Cluster | null = null;
    let nearestDist = Infinity;

    for (const cluster of this.clusters) {
      const dist = Math.abs(value - cluster.centroid);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = cluster;
      }
    }

    return nearest;
  }

  /**
   * Reset the engine
   */
  reset(): void {
    this.data = [];
    this.clusters = [];
  }
}

/**
 * Create clustering engine
 */
export function createClusteringEngine(config?: Partial<KMeansConfig>): ClusteringEngine {
  return new ClusteringEngine(config);
}

// Singleton instance
let clusteringInstance: ClusteringEngine | null = null;

/**
 * Get or create clustering engine instance
 */
export function getClusteringEngine(config?: Partial<KMeansConfig>): ClusteringEngine {
  if (!clusteringInstance) {
    clusteringInstance = new ClusteringEngine(config);
  }
  return clusteringInstance;
}
