/**
 * TrendAnalyzer
 * Analyzes historical consensus patterns and detects trends
 */

import {
  ItemConsensus,
  ConsensusTrend,
  CommunityRanking,
} from './types';

/**
 * Historical data point
 */
interface HistoricalPoint {
  timestamp: number;
  averagePosition: number;
  consensusScore: number;
  sampleSize: number;
}

/**
 * Trend calculation result
 */
export interface TrendResult {
  itemId: string;
  trend: ConsensusTrend;
  isSignificant: boolean;
  confidence: number;
  prediction?: {
    position: number;
    consensusScore: number;
    timeframe: string;
  };
}

/**
 * Trend detection thresholds
 */
const THRESHOLDS = {
  minDataPoints: 3,
  significantChange: 5, // positions
  significantVelocity: 0.5, // positions per hour
  confidenceMultiplier: 10,
  trendStrengthCap: 100,
};

/**
 * Calculate linear regression for trend detection
 */
function linearRegression(
  points: Array<{ x: number; y: number }>
): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  // Calculate means
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;

  for (const point of points) {
    numerator += (point.x - meanX) * (point.y - meanY);
    denominator += Math.pow(point.x - meanX, 2);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;

  // Calculate R-squared (coefficient of determination)
  let ssRes = 0;
  let ssTot = 0;

  for (const point of points) {
    const predicted = slope * point.x + intercept;
    ssRes += Math.pow(point.y - predicted, 2);
    ssTot += Math.pow(point.y - meanY, 2);
  }

  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}

/**
 * Determine trend direction from slope
 */
function getTrendDirection(
  slope: number,
  threshold: number = 0.1
): 'rising' | 'falling' | 'stable' {
  if (slope > threshold) return 'falling'; // Higher position = worse rank
  if (slope < -threshold) return 'rising'; // Lower position = better rank
  return 'stable';
}

/**
 * Calculate trend strength from slope and R-squared
 */
function calculateTrendStrength(slope: number, r2: number): number {
  // Combine slope magnitude with fit quality
  const slopeMagnitude = Math.min(Math.abs(slope) * THRESHOLDS.confidenceMultiplier, 50);
  const fitQuality = r2 * 50;
  return Math.min(slopeMagnitude + fitQuality, THRESHOLDS.trendStrengthCap);
}

/**
 * Analyze trend for a single item
 */
export function analyzeItemTrend(
  itemId: string,
  history: HistoricalPoint[]
): ConsensusTrend {
  // Sort by timestamp
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);

  if (sorted.length < THRESHOLDS.minDataPoints) {
    return {
      itemId,
      history: sorted,
      trendDirection: 'stable',
      trendStrength: 0,
      velocityPerHour: 0,
    };
  }

  // Prepare data for regression
  const firstTimestamp = sorted[0].timestamp;
  const points = sorted.map((h) => ({
    x: (h.timestamp - firstTimestamp) / 3600000, // Hours since first point
    y: h.averagePosition,
  }));

  // Perform regression
  const { slope, r2 } = linearRegression(points);

  // Calculate metrics
  const direction = getTrendDirection(slope);
  const strength = calculateTrendStrength(slope, r2);
  const velocityPerHour = slope;

  // Generate prediction if we have enough confidence
  let prediction: ConsensusTrend['predictedPosition'];
  let confidence: ConsensusTrend['confidence'];

  if (r2 > 0.5 && sorted.length >= 5) {
    const lastPoint = sorted[sorted.length - 1];
    const hoursAhead = 24; // Predict 24 hours ahead
    const predictedPosition = Math.max(
      0,
      lastPoint.averagePosition + slope * hoursAhead
    );

    prediction = Math.round(predictedPosition);
    confidence = Math.round(r2 * 100);
  }

  return {
    itemId,
    history: sorted,
    trendDirection: direction,
    trendStrength: Math.round(strength),
    velocityPerHour: Math.round(velocityPerHour * 100) / 100,
    predictedPosition: prediction,
    confidence,
  };
}

/**
 * Analyze trends for all items in a community ranking
 */
export function analyzeCommunityTrends(
  current: CommunityRanking,
  historicalData: Map<string, HistoricalPoint[]>
): Map<string, ConsensusTrend> {
  const trends = new Map<string, ConsensusTrend>();

  for (const item of current.items) {
    const history = historicalData.get(item.itemId) || [];

    // Add current point to history
    const currentPoint: HistoricalPoint = {
      timestamp: current.lastUpdated,
      averagePosition: item.averagePosition,
      consensusScore: item.consensusScore,
      sampleSize: item.sampleSize,
    };

    const fullHistory = [...history, currentPoint];
    const trend = analyzeItemTrend(item.itemId, fullHistory);

    trends.set(item.itemId, trend);
  }

  return trends;
}

/**
 * Find items with significant trends
 */
export function findSignificantTrends(
  trends: Map<string, ConsensusTrend>,
  minStrength: number = 30
): TrendResult[] {
  const results: TrendResult[] = [];

  trends.forEach((trend, itemId) => {
    const isSignificant =
      trend.trendStrength >= minStrength &&
      trend.trendDirection !== 'stable';

    results.push({
      itemId,
      trend,
      isSignificant,
      confidence: trend.confidence || Math.min(trend.trendStrength, 80),
      prediction: trend.predictedPosition
        ? {
            position: trend.predictedPosition,
            consensusScore: 0, // Would need consensus prediction model
            timeframe: '24h',
          }
        : undefined,
    });
  });

  // Sort by significance and strength
  return results.sort((a, b) => {
    if (a.isSignificant !== b.isSignificant) {
      return a.isSignificant ? -1 : 1;
    }
    return b.trend.trendStrength - a.trend.trendStrength;
  });
}

/**
 * Detect sudden consensus shifts
 */
export function detectConsensusShifts(
  trends: Map<string, ConsensusTrend>,
  velocityThreshold: number = THRESHOLDS.significantVelocity
): Array<{
  itemId: string;
  velocity: number;
  direction: 'rising' | 'falling';
  magnitude: 'minor' | 'moderate' | 'major';
}> {
  const shifts: Array<{
    itemId: string;
    velocity: number;
    direction: 'rising' | 'falling';
    magnitude: 'minor' | 'moderate' | 'major';
  }> = [];

  trends.forEach((trend, itemId) => {
    if (Math.abs(trend.velocityPerHour) >= velocityThreshold) {
      const magnitude =
        Math.abs(trend.velocityPerHour) >= velocityThreshold * 3
          ? 'major'
          : Math.abs(trend.velocityPerHour) >= velocityThreshold * 1.5
          ? 'moderate'
          : 'minor';

      shifts.push({
        itemId,
        velocity: trend.velocityPerHour,
        direction: trend.velocityPerHour < 0 ? 'rising' : 'falling',
        magnitude,
      });
    }
  });

  return shifts.sort((a, b) => Math.abs(b.velocity) - Math.abs(a.velocity));
}

/**
 * Calculate overall community trend
 */
export function calculateOverallTrend(
  trends: Map<string, ConsensusTrend>
): {
  averageStrength: number;
  dominantDirection: 'rising' | 'falling' | 'stable' | 'mixed';
  volatility: number;
} {
  if (trends.size === 0) {
    return {
      averageStrength: 0,
      dominantDirection: 'stable',
      volatility: 0,
    };
  }

  const trendsArray = Array.from(trends.values());

  // Calculate average strength
  const averageStrength =
    trendsArray.reduce((sum, t) => sum + t.trendStrength, 0) / trends.size;

  // Count directions
  const directions = {
    rising: 0,
    falling: 0,
    stable: 0,
  };

  trendsArray.forEach((t) => {
    directions[t.trendDirection]++;
  });

  // Determine dominant direction
  let dominantDirection: 'rising' | 'falling' | 'stable' | 'mixed';
  const total = trends.size;
  const threshold = 0.4; // 40% must agree for a dominant direction

  if (directions.rising / total > threshold) {
    dominantDirection = 'rising';
  } else if (directions.falling / total > threshold) {
    dominantDirection = 'falling';
  } else if (directions.stable / total > threshold) {
    dominantDirection = 'stable';
  } else {
    dominantDirection = 'mixed';
  }

  // Calculate volatility (variance in velocities)
  const velocities = trendsArray.map((t) => t.velocityPerHour);
  const meanVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const variance =
    velocities.reduce((sum, v) => sum + Math.pow(v - meanVelocity, 2), 0) /
    velocities.length;
  const volatility = Math.min(Math.sqrt(variance) * 20, 100);

  return {
    averageStrength: Math.round(averageStrength),
    dominantDirection,
    volatility: Math.round(volatility),
  };
}

/**
 * Singleton analyzer instance
 */
export const TrendAnalyzer = {
  analyzeItem: analyzeItemTrend,
  analyzeCommunity: analyzeCommunityTrends,
  findSignificant: findSignificantTrends,
  detectShifts: detectConsensusShifts,
  calculateOverall: calculateOverallTrend,
};

export default TrendAnalyzer;
