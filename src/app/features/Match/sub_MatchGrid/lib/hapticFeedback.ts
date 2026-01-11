/**
 * Haptic Feedback System
 *
 * Provides tactile feedback using the Web Vibration API for:
 * - Resistance when placing #1 (strongest feedback)
 * - Momentum feedback when flicking items
 * - Subtle vibrations during swaps
 * - Position-based feedback intensity
 */

export interface HapticPattern {
  /** Vibration pattern (alternating vibrate/pause durations in ms) */
  pattern: number[];
  /** Description of the haptic event */
  description: string;
}

export interface HapticConfig {
  /** Whether haptics are enabled (respects user preference) */
  enabled: boolean;
  /** Global intensity multiplier (0-1) */
  intensity: number;
  /** Whether to use reduced motion patterns */
  reducedMotion: boolean;
}

// Default haptic configuration
const DEFAULT_HAPTIC_CONFIG: HapticConfig = {
  enabled: true,
  intensity: 1.0,
  reducedMotion: false,
};

// Predefined haptic patterns for different interactions
export const HAPTIC_PATTERNS = {
  // Drag interactions
  dragStart: {
    pattern: [10],
    description: 'Quick tap when starting drag',
  },
  dragOver: {
    pattern: [5],
    description: 'Light tap when hovering over valid drop zone',
  },
  dragEnd: {
    pattern: [15, 10, 15],
    description: 'Double tap on successful drop',
  },
  dragCancel: {
    pattern: [5, 5, 5],
    description: 'Triple light tap on cancel',
  },

  // Position-based feedback
  dropPosition1: {
    pattern: [50, 30, 80, 30, 50],
    description: 'Strong celebratory pattern for #1 position',
  },
  dropPosition2: {
    pattern: [40, 25, 60, 25, 40],
    description: 'Medium celebratory pattern for #2 position',
  },
  dropPosition3: {
    pattern: [30, 20, 45, 20, 30],
    description: 'Light celebratory pattern for #3 position',
  },
  dropPositionTop10: {
    pattern: [20, 15, 30],
    description: 'Subtle feedback for top 10',
  },
  dropPositionRegular: {
    pattern: [15],
    description: 'Minimal feedback for regular positions',
  },

  // Swap interactions
  swapStart: {
    pattern: [20, 10, 20],
    description: 'Items beginning to swap',
  },
  swapMidpoint: {
    pattern: [30],
    description: 'Items passing each other',
  },
  swapComplete: {
    pattern: [15, 10, 25],
    description: 'Swap animation complete',
  },

  // Gravity well feedback
  gravityWellEnter: {
    pattern: [10, 5, 15, 5, 20],
    description: 'Entering gravity well influence',
  },
  gravityWellPull: {
    pattern: [5],
    description: 'Continuous light pulse during pull',
  },
  gravityWellSnap: {
    pattern: [40, 20, 60],
    description: 'Snapping to gravity well center',
  },

  // Resistance feedback
  resistanceLight: {
    pattern: [8, 8, 8],
    description: 'Light resistance felt',
  },
  resistanceMedium: {
    pattern: [15, 10, 15, 10, 15],
    description: 'Medium resistance from tenure',
  },
  resistanceHeavy: {
    pattern: [25, 15, 30, 15, 35, 15, 25],
    description: 'Heavy resistance - item deeply rooted',
  },

  // Momentum/flick feedback
  flickLight: {
    pattern: [5, 3, 5],
    description: 'Light flick detected',
  },
  flickMedium: {
    pattern: [10, 5, 15, 5, 10],
    description: 'Medium flick with momentum',
  },
  flickStrong: {
    pattern: [20, 10, 30, 10, 40, 10, 20],
    description: 'Strong flick with high velocity',
  },

  // Bounce feedback
  bounceFirst: {
    pattern: [30],
    description: 'First bounce impact',
  },
  bounceSecond: {
    pattern: [15],
    description: 'Second bounce (reduced)',
  },
  bounceSettle: {
    pattern: [8],
    description: 'Final settle',
  },

  // UI feedback
  buttonPress: {
    pattern: [10],
    description: 'Button press feedback',
  },
  toggleOn: {
    pattern: [15, 10, 25],
    description: 'Toggle activated',
  },
  toggleOff: {
    pattern: [10, 10, 10],
    description: 'Toggle deactivated',
  },
  error: {
    pattern: [50, 30, 50, 30, 50],
    description: 'Error occurred',
  },
  success: {
    pattern: [20, 15, 40, 15, 60],
    description: 'Success confirmation',
  },
} as const;

export type HapticPatternName = keyof typeof HAPTIC_PATTERNS;

/**
 * Check if the Vibration API is supported
 */
export function isHapticSupported(): boolean {
  return typeof window !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Get user's reduced motion preference
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Global haptic configuration state
let globalHapticConfig: HapticConfig = { ...DEFAULT_HAPTIC_CONFIG };

/**
 * Configure global haptic settings
 */
export function configureHaptics(config: Partial<HapticConfig>): void {
  globalHapticConfig = {
    ...globalHapticConfig,
    ...config,
  };
}

/**
 * Get current haptic configuration
 */
export function getHapticConfig(): HapticConfig {
  return { ...globalHapticConfig };
}

/**
 * Scale a vibration pattern by intensity
 */
function scalePattern(pattern: number[], intensity: number): number[] {
  return pattern.map(duration => Math.round(duration * intensity));
}

/**
 * Convert pattern to reduced motion version
 */
function reducePattern(pattern: number[]): number[] {
  // For reduced motion, use single short vibration
  const totalDuration = pattern.reduce((a, b) => a + b, 0);
  return [Math.min(totalDuration * 0.3, 20)];
}

/**
 * Trigger haptic feedback with a predefined pattern
 */
export function triggerHaptic(
  patternName: HapticPatternName,
  intensityOverride?: number
): boolean {
  if (!isHapticSupported() || !globalHapticConfig.enabled) {
    return false;
  }

  const pattern = HAPTIC_PATTERNS[patternName];
  const intensity = intensityOverride ?? globalHapticConfig.intensity;

  // Convert readonly array to mutable array
  let finalPattern = scalePattern([...pattern.pattern], intensity);

  if (globalHapticConfig.reducedMotion || prefersReducedMotion()) {
    finalPattern = reducePattern(finalPattern);
  }

  try {
    navigator.vibrate(finalPattern);
    return true;
  } catch (error) {
    console.warn('Haptic feedback failed:', error);
    return false;
  }
}

/**
 * Trigger custom haptic pattern
 */
export function triggerCustomHaptic(
  pattern: number[],
  intensity?: number
): boolean {
  if (!isHapticSupported() || !globalHapticConfig.enabled) {
    return false;
  }

  const scaledIntensity = intensity ?? globalHapticConfig.intensity;
  let finalPattern = scalePattern(pattern, scaledIntensity);

  if (globalHapticConfig.reducedMotion || prefersReducedMotion()) {
    finalPattern = reducePattern(finalPattern);
  }

  try {
    navigator.vibrate(finalPattern);
    return true;
  } catch (error) {
    console.warn('Haptic feedback failed:', error);
    return false;
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopHaptic(): void {
  if (isHapticSupported()) {
    navigator.vibrate(0);
  }
}

/**
 * Get position-specific haptic pattern for drops
 */
export function getDropPositionPattern(position: number): HapticPatternName {
  if (position === 0) return 'dropPosition1';
  if (position === 1) return 'dropPosition2';
  if (position === 2) return 'dropPosition3';
  if (position < 10) return 'dropPositionTop10';
  return 'dropPositionRegular';
}

/**
 * Calculate flick pattern based on velocity
 */
export function getFlickPattern(velocity: { x: number; y: number }): HapticPatternName {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

  if (speed > 1000) return 'flickStrong';
  if (speed > 500) return 'flickMedium';
  return 'flickLight';
}

/**
 * Calculate resistance pattern based on tenure
 */
export function getResistancePattern(tenureMs: number): HapticPatternName {
  if (tenureMs > 60000) return 'resistanceHeavy'; // > 1 minute
  if (tenureMs > 30000) return 'resistanceMedium'; // > 30 seconds
  return 'resistanceLight';
}

/**
 * Create a bounce sequence with diminishing haptics
 */
export function triggerBounceSequence(
  bounceCount: number,
  initialIntensity: number = 1.0,
  decayFactor: number = 0.5
): void {
  const bounces = Math.min(bounceCount, 3); // Max 3 bounce feedbacks
  const patterns: Array<{ pattern: HapticPatternName; delay: number; intensity: number }> = [];

  let currentIntensity = initialIntensity;

  for (let i = 0; i < bounces; i++) {
    let patternName: HapticPatternName;
    if (i === 0) patternName = 'bounceFirst';
    else if (i === 1) patternName = 'bounceSecond';
    else patternName = 'bounceSettle';

    patterns.push({
      pattern: patternName,
      delay: i * 150, // 150ms between bounces
      intensity: currentIntensity,
    });

    currentIntensity *= decayFactor;
  }

  // Execute sequence
  patterns.forEach(({ pattern, delay, intensity }) => {
    setTimeout(() => {
      triggerHaptic(pattern, intensity);
    }, delay);
  });
}

/**
 * Trigger swap sequence haptics
 */
export function triggerSwapSequence(duration: number = 300): void {
  // Start
  triggerHaptic('swapStart');

  // Midpoint
  setTimeout(() => {
    triggerHaptic('swapMidpoint');
  }, duration / 2);

  // Complete
  setTimeout(() => {
    triggerHaptic('swapComplete');
  }, duration);
}

/**
 * Trigger gravity well sequence
 */
export function triggerGravityWellSequence(
  pullDuration: number,
  pullIntensity: number = 0.5
): void {
  // Enter
  triggerHaptic('gravityWellEnter');

  // Continuous light pulses during pull
  const pulseInterval = 100;
  const pulseCount = Math.floor(pullDuration / pulseInterval);

  for (let i = 0; i < pulseCount; i++) {
    setTimeout(() => {
      triggerHaptic('gravityWellPull', pullIntensity);
    }, pulseInterval * (i + 1));
  }

  // Snap at the end
  setTimeout(() => {
    triggerHaptic('gravityWellSnap');
  }, pullDuration);
}

/**
 * React hook for haptic feedback
 */
export function useHapticFeedback() {
  return {
    isSupported: isHapticSupported(),
    config: globalHapticConfig,
    configure: configureHaptics,
    trigger: triggerHaptic,
    triggerCustom: triggerCustomHaptic,
    stop: stopHaptic,
    getDropPattern: getDropPositionPattern,
    getFlickPattern,
    getResistancePattern,
    triggerBounce: triggerBounceSequence,
    triggerSwap: triggerSwapSequence,
    triggerGravityWell: triggerGravityWellSequence,
  };
}
