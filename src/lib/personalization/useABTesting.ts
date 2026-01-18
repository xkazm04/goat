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
 * Assign user to a variant deterministically
 */
function assignVariant(userId: string, experiment: ABTest): ABTestVariant | null {
  if (!experiment.isActive) return null;

  // Check if experiment has ended
  if (experiment.endDate && Date.now() > experiment.endDate) return null;

  // Check traffic allocation
  const userHash = hashString(userId + experiment.id);
  const trafficBucket = userHash % 100;
  if (trafficBucket >= experiment.trafficPercentage) return null;

  // Assign to variant based on weights
  const variantBucket = hashString(userId + experiment.id + '-variant') % 100;
  let cumulativeWeight = 0;

  for (const variant of experiment.variants) {
    cumulativeWeight += variant.weight;
    if (variantBucket < cumulativeWeight) {
      return variant;
    }
  }

  // Fallback to first variant
  return experiment.variants[0];
}

/**
 * Simple string hash function
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
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

    // Log impression (could send to analytics)
    console.log(`[A/B Test] Impression: ${experimentId} - ${variantId}`);

    // Could integrate with analytics here
    // analytics.track('experiment_impression', { experimentId, variantId });
  }, [experimentId, variantId]);
}

/**
 * Track experiment conversion
 */
export function useTrackExperimentConversion() {
  return useCallback(
    (experimentId: string, variantId: string, action: string, metadata?: Record<string, unknown>) => {
      // Log conversion (could send to analytics)
      console.log(`[A/B Test] Conversion: ${experimentId} - ${variantId} - ${action}`, metadata);

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
