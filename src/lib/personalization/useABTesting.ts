/**
 * A/B Testing Hooks
 * Framework for running experiments on personalization and showcase
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { getInterestTracker } from './InterestTracker';
import { ABTest, ABTestVariant } from './types';

/**
 * Available experiments
 */
export const EXPERIMENTS: Record<string, ABTest> = {
  'showcase-strategy': {
    id: 'showcase-strategy',
    name: 'Showcase Selection Strategy',
    description: 'Compare personalized vs popular vs contextual content selection',
    variants: [
      { id: 'personalized', name: 'Personalized', weight: 40, config: { strategy: 'personalized' } },
      { id: 'popular', name: 'Popular', weight: 30, config: { strategy: 'popular' } },
      { id: 'contextual', name: 'Contextual', weight: 30, config: { strategy: 'contextual' } },
    ],
    trafficPercentage: 100,
    startDate: Date.now(),
    isActive: true,
  },
  'carousel-autoplay': {
    id: 'carousel-autoplay',
    name: 'Carousel Auto-Play Speed',
    description: 'Test different auto-play intervals for engagement',
    variants: [
      { id: 'slow', name: 'Slow (6s)', weight: 33, config: { interval: 6000 } },
      { id: 'medium', name: 'Medium (4s)', weight: 34, config: { interval: 4000 } },
      { id: 'fast', name: 'Fast (3s)', weight: 33, config: { interval: 3000 } },
    ],
    trafficPercentage: 100,
    startDate: Date.now(),
    isActive: true,
  },
  'hero-layout': {
    id: 'hero-layout',
    name: 'Hero Section Layout',
    description: 'Test single hero vs multiple featured cards',
    variants: [
      { id: 'single', name: 'Single Hero', weight: 50, config: { heroSlots: 1, featuredSlots: 3 } },
      { id: 'multi', name: 'Multiple Heroes', weight: 50, config: { heroSlots: 3, featuredSlots: 1 } },
    ],
    trafficPercentage: 50,
    startDate: Date.now(),
    isActive: true,
  },
  'personalization-weight': {
    id: 'personalization-weight',
    name: 'Personalization Weight',
    description: 'Test different interest vs popularity weighting',
    variants: [
      { id: 'interest-heavy', name: 'Interest Heavy', weight: 33, config: { interestWeight: 0.6, popularityWeight: 0.2 } },
      { id: 'balanced', name: 'Balanced', weight: 34, config: { interestWeight: 0.4, popularityWeight: 0.3 } },
      { id: 'popularity-heavy', name: 'Popularity Heavy', weight: 33, config: { interestWeight: 0.2, popularityWeight: 0.5 } },
    ],
    trafficPercentage: 100,
    startDate: Date.now(),
    isActive: true,
  },
};

/**
 * Assign user to a variant deterministically.
 * Uses MurmurHash3 for uniform distribution and normalizes weights
 * so misconfigured totals (e.g. 99 or 101) don't bias assignment.
 */
function assignVariant(userId: string, experiment: ABTest): ABTestVariant | null {
  if (!experiment.isActive) return null;

  // Check if experiment has ended
  if (experiment.endDate && Date.now() > experiment.endDate) return null;

  // Check traffic allocation — use float division for uniform [0, 100) bucket
  const trafficHash = murmurhash3(userId + experiment.id);
  const trafficBucket = (trafficHash / 0x100000000) * 100;
  if (trafficBucket >= experiment.trafficPercentage) return null;

  // Assign to variant based on normalized weights
  const variantHash = murmurhash3(userId + experiment.id + '-variant');
  const variantBucket = variantHash / 0x100000000; // [0, 1)

  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  let cumulative = 0;

  for (const variant of experiment.variants) {
    cumulative += variant.weight / totalWeight;
    if (variantBucket < cumulative) {
      return variant;
    }
  }

  // Fallback to last variant (handles floating-point edge case)
  return experiment.variants[experiment.variants.length - 1];
}

/**
 * MurmurHash3 (32-bit) for uniform bucket distribution.
 * Produces well-distributed hashes suitable for A/B test assignment.
 */
function murmurhash3(str: string, seed: number = 0): number {
  let h1 = seed >>> 0;
  const len = str.length;
  let i = 0;

  while (i + 4 <= len) {
    let k1 =
      (str.charCodeAt(i) & 0xff) |
      ((str.charCodeAt(i + 1) & 0xff) << 8) |
      ((str.charCodeAt(i + 2) & 0xff) << 16) |
      ((str.charCodeAt(i + 3) & 0xff) << 24);

    k1 = Math.imul(k1, 0xcc9e2d51);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, 0x1b873593);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;

    i += 4;
  }

  // Process remaining bytes
  let k1 = 0;
  switch (len & 3) {
    case 3:
      k1 ^= (str.charCodeAt(i + 2) & 0xff) << 16;
    // falls through
    case 2:
      k1 ^= (str.charCodeAt(i + 1) & 0xff) << 8;
    // falls through
    case 1:
      k1 ^= str.charCodeAt(i) & 0xff;
      k1 = Math.imul(k1, 0xcc9e2d51);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, 0x1b873593);
      h1 ^= k1;
  }

  // Finalization mix
  h1 ^= len;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0; // Ensure unsigned 32-bit
}

/**
 * Hook for A/B testing
 */
export function useABTest<T = Record<string, unknown>>(
  experimentId: string
): {
  variant: ABTestVariant | null;
  config: T;
  isLoading: boolean;
  experimentId: string;
  variantId: string | null;
} {
  const [variant, setVariant] = useState<ABTestVariant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initExperiment = async () => {
      const tracker = getInterestTracker();
      const profile = await tracker.initialize();

      const experiment = EXPERIMENTS[experimentId];
      if (!experiment) {
        setIsLoading(false);
        return;
      }

      // Check if user already assigned
      let assignedVariantId = tracker.getExperiment(experimentId);
      let assignedVariant: ABTestVariant | null = null;

      if (assignedVariantId) {
        // Use existing assignment
        assignedVariant = experiment.variants.find((v) => v.id === assignedVariantId) || null;
      } else {
        // Assign new variant
        assignedVariant = assignVariant(profile.id, experiment);
        if (assignedVariant) {
          tracker.setExperiment(experimentId, assignedVariant.id);
        }
      }

      setVariant(assignedVariant);
      setIsLoading(false);
    };

    initExperiment();
  }, [experimentId]);

  const config = useMemo(() => {
    return (variant?.config || {}) as T;
  }, [variant]);

  return {
    variant,
    config,
    isLoading,
    experimentId,
    variantId: variant?.id || null,
  };
}

/**
 * Hook for showcase strategy experiment
 */
export function useShowcaseStrategyExperiment() {
  return useABTest<{ strategy: string }>('showcase-strategy');
}

/**
 * Hook for carousel autoplay experiment
 */
export function useCarouselAutoplayExperiment() {
  return useABTest<{ interval: number }>('carousel-autoplay');
}

/**
 * Hook for hero layout experiment
 */
export function useHeroLayoutExperiment() {
  return useABTest<{ heroSlots: number; featuredSlots: number }>('hero-layout');
}

/**
 * Hook for personalization weight experiment
 */
export function usePersonalizationWeightExperiment() {
  return useABTest<{ interestWeight: number; popularityWeight: number }>('personalization-weight');
}

/**
 * Track experiment impression
 */
export function useTrackExperimentImpression(
  experimentId: string,
  variantId: string | null
): void {
  useEffect(() => {
    if (!variantId) return;

    // Could integrate with analytics here
    // analytics.track('experiment_impression', { experimentId, variantId });
  }, [experimentId, variantId]);
}

/**
 * Track experiment conversion
 */
export function useTrackExperimentConversion() {
  return useCallback(
    (_experimentId: string, _variantId: string, _action: string, _metadata?: Record<string, unknown>) => {
      // Could integrate with analytics here
      // analytics.track('experiment_conversion', { experimentId, variantId, action, ...metadata });
    },
    []
  );
}

/**
 * Get all active experiments for a user
 */
export function useActiveExperiments(): {
  experiments: Array<{ experiment: ABTest; variant: ABTestVariant | null }>;
  isLoading: boolean;
} {
  const [experiments, setExperiments] = useState<
    Array<{ experiment: ABTest; variant: ABTestVariant | null }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadExperiments = async () => {
      const tracker = getInterestTracker();
      const profile = await tracker.initialize();

      const results = Object.values(EXPERIMENTS)
        .filter((exp) => exp.isActive)
        .map((experiment) => {
          let variant = experiment.variants.find(
            (v) => v.id === tracker.getExperiment(experiment.id)
          );

          if (!variant) {
            variant = assignVariant(profile.id, experiment) || undefined;
            if (variant) {
              tracker.setExperiment(experiment.id, variant.id);
            }
          }

          return { experiment, variant: variant || null };
        });

      setExperiments(results);
      setIsLoading(false);
    };

    loadExperiments();
  }, []);

  return { experiments, isLoading };
}

/**
 * Debug hook to override experiment variant (development only)
 */
export function useExperimentOverride(
  experimentId: string,
  variantId: string
): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const tracker = getInterestTracker();
    tracker.setExperiment(experimentId, variantId);

    console.log(`[A/B Test] Override: ${experimentId} -> ${variantId}`);
  }, [experimentId, variantId]);
}
