/**
 * Haptic Engine
 * Coordinates device haptics with magnetic snap state
 * Provides distance-based intensity and threshold triggers
 */

/**
 * Haptic intensity levels
 */
export type HapticIntensity = 'none' | 'light' | 'medium' | 'heavy';

/**
 * Haptic event types for magnetic interactions
 */
export type MagneticHapticEvent =
  | 'fieldEnter'
  | 'fieldExit'
  | 'thresholdOuter'
  | 'thresholdMiddle'
  | 'thresholdInner'
  | 'snap'
  | 'release'
  | 'pull';

/**
 * Haptic pattern definition
 */
export interface HapticPattern {
  /** Vibration pattern (alternating vibrate/pause durations in ms) */
  pattern: number[];
  /** Intensity multiplier (0-1) */
  intensity: number;
}

/**
 * Haptic engine configuration
 */
export interface HapticEngineConfig {
  /** Whether haptics are enabled */
  enabled: boolean;
  /** Global intensity multiplier (0-1) */
  globalIntensity: number;
  /** Minimum interval between haptic triggers (ms) */
  minInterval: number;
  /** Whether to use continuous pull haptics */
  continuousPull: boolean;
  /** Pull haptic interval (ms) */
  pullInterval: number;
  /** Respect user's reduced motion preference */
  respectReducedMotion: boolean;
}

/**
 * Magnetic haptic state for tracking changes
 */
export interface MagneticHapticState {
  /** Current haptic level (0-3) */
  level: number;
  /** Whether in any field */
  inField: boolean;
  /** Currently snapped */
  isSnapped: boolean;
  /** Last event triggered */
  lastEvent: MagneticHapticEvent | null;
  /** Timestamp of last haptic */
  lastHapticTime: number;
}

/**
 * Default haptic patterns for magnetic events
 */
const MAGNETIC_HAPTIC_PATTERNS: Record<MagneticHapticEvent, HapticPattern> = {
  fieldEnter: {
    pattern: [10, 5, 15],
    intensity: 0.5,
  },
  fieldExit: {
    pattern: [8, 5, 8],
    intensity: 0.3,
  },
  thresholdOuter: {
    pattern: [15],
    intensity: 0.4,
  },
  thresholdMiddle: {
    pattern: [20, 10, 20],
    intensity: 0.6,
  },
  thresholdInner: {
    pattern: [30, 15, 40],
    intensity: 0.8,
  },
  snap: {
    pattern: [50, 25, 70],
    intensity: 1.0,
  },
  release: {
    pattern: [15, 10, 15],
    intensity: 0.5,
  },
  pull: {
    pattern: [5],
    intensity: 0.2,
  },
};

/**
 * Intensity-based pattern scaling
 */
const INTENSITY_PATTERNS: Record<HapticIntensity, { scale: number; maxDuration: number }> = {
  none: { scale: 0, maxDuration: 0 },
  light: { scale: 0.3, maxDuration: 20 },
  medium: { scale: 0.6, maxDuration: 40 },
  heavy: { scale: 1.0, maxDuration: 80 },
};

/**
 * HapticEngine class
 * Coordinates haptic feedback with magnetic snap state
 */
export class HapticEngine {
  private config: HapticEngineConfig;
  private state: MagneticHapticState;
  private pullInterval: NodeJS.Timeout | null = null;
  private isSupported: boolean;

  constructor(config?: Partial<HapticEngineConfig>) {
    this.config = {
      enabled: true,
      globalIntensity: 1.0,
      minInterval: 50,
      continuousPull: true,
      pullInterval: 100,
      respectReducedMotion: true,
      ...config,
    };

    this.state = {
      level: 0,
      inField: false,
      isSnapped: false,
      lastEvent: null,
      lastHapticTime: 0,
    };

    this.isSupported = this.checkSupport();
  }

  /**
   * Check if haptics are supported
   */
  private checkSupport(): boolean {
    return typeof window !== 'undefined' && 'vibrate' in navigator;
  }

  /**
   * Check if reduced motion is preferred
   */
  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Check if haptics should be triggered
   */
  private shouldTrigger(): boolean {
    if (!this.isSupported || !this.config.enabled) return false;
    if (this.config.respectReducedMotion && this.prefersReducedMotion()) return false;

    const now = Date.now();
    if (now - this.state.lastHapticTime < this.config.minInterval) return false;

    return true;
  }

  /**
   * Scale a pattern by intensity
   */
  private scalePattern(pattern: number[], intensity: number): number[] {
    const scaledIntensity = intensity * this.config.globalIntensity;
    return pattern.map((duration) => Math.round(duration * scaledIntensity));
  }

  /**
   * Reduce pattern for accessibility
   */
  private reducePattern(pattern: number[]): number[] {
    const total = pattern.reduce((a, b) => a + b, 0);
    return [Math.min(total * 0.3, 15)];
  }

  /**
   * Trigger a haptic pattern
   */
  private triggerPattern(
    event: MagneticHapticEvent,
    intensityOverride?: number
  ): boolean {
    if (!this.shouldTrigger()) return false;

    const patternConfig = MAGNETIC_HAPTIC_PATTERNS[event];
    const intensity = intensityOverride ?? patternConfig.intensity;

    let finalPattern = this.scalePattern(patternConfig.pattern, intensity);

    if (this.config.respectReducedMotion && this.prefersReducedMotion()) {
      finalPattern = this.reducePattern(finalPattern);
    }

    try {
      navigator.vibrate(finalPattern);
      this.state.lastHapticTime = Date.now();
      this.state.lastEvent = event;
      return true;
    } catch (error) {
      console.warn('Haptic trigger failed:', error);
      return false;
    }
  }

  /**
   * Trigger haptic by intensity level
   */
  triggerByIntensity(intensity: HapticIntensity): boolean {
    if (!this.shouldTrigger() || intensity === 'none') return false;

    const { scale, maxDuration } = INTENSITY_PATTERNS[intensity];
    const pattern = [Math.round(maxDuration * scale)];

    try {
      navigator.vibrate(pattern);
      this.state.lastHapticTime = Date.now();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Trigger continuous pull haptic
   */
  triggerPull(strength: number): boolean {
    const intensity = Math.min(1, Math.max(0, strength));
    return this.triggerPattern('pull', intensity * 0.3);
  }

  /**
   * Update magnetic state and trigger appropriate haptics
   */
  updateMagneticState(newState: {
    level: number;
    inField: boolean;
    isSnapped: boolean;
    pullStrength?: number;
  }): void {
    const { level, inField, isSnapped, pullStrength } = newState;

    // Field enter/exit
    if (inField && !this.state.inField) {
      this.triggerPattern('fieldEnter');
    } else if (!inField && this.state.inField) {
      this.triggerPattern('fieldExit');
      this.stopContinuousPull();
    }

    // Level changes (threshold crossings)
    if (level !== this.state.level && inField) {
      if (level > this.state.level) {
        // Moving closer
        if (level >= 3) {
          this.triggerPattern('thresholdInner');
        } else if (level >= 2) {
          this.triggerPattern('thresholdMiddle');
        } else if (level >= 1) {
          this.triggerPattern('thresholdOuter');
        }
      }
      // Note: We don't trigger on moving away (level decrease) to reduce haptic spam
    }

    // Snap state changes
    if (isSnapped && !this.state.isSnapped) {
      this.triggerPattern('snap');
      this.stopContinuousPull();
    } else if (!isSnapped && this.state.isSnapped) {
      this.triggerPattern('release');
    }

    // Start/stop continuous pull
    if (
      this.config.continuousPull &&
      inField &&
      !isSnapped &&
      pullStrength !== undefined &&
      pullStrength > 0.2
    ) {
      this.startContinuousPull(pullStrength);
    } else {
      this.stopContinuousPull();
    }

    // Update state
    this.state = {
      ...this.state,
      level,
      inField,
      isSnapped,
    };
  }

  /**
   * Start continuous pull haptics
   */
  private startContinuousPull(strength: number): void {
    if (this.pullInterval) return;

    this.pullInterval = setInterval(() => {
      this.triggerPull(strength);
    }, this.config.pullInterval);
  }

  /**
   * Stop continuous pull haptics
   */
  private stopContinuousPull(): void {
    if (this.pullInterval) {
      clearInterval(this.pullInterval);
      this.pullInterval = null;
    }
  }

  /**
   * Stop all haptics
   */
  stop(): void {
    this.stopContinuousPull();
    if (this.isSupported) {
      navigator.vibrate(0);
    }
  }

  /**
   * Reset state
   */
  reset(): void {
    this.stop();
    this.state = {
      level: 0,
      inField: false,
      isSnapped: false,
      lastEvent: null,
      lastHapticTime: 0,
    };
  }

  /**
   * Destroy engine (alias for reset)
   */
  destroy(): void {
    this.reset();
  }

  /**
   * Configure engine
   */
  configure(config: Partial<HapticEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current state
   */
  getState(): MagneticHapticState {
    return { ...this.state };
  }

  /**
   * Check if haptics are supported
   */
  getIsSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Trigger custom pattern
   */
  triggerCustom(pattern: number[], intensity?: number): boolean {
    if (!this.shouldTrigger()) return false;

    const scaledIntensity = (intensity ?? 1) * this.config.globalIntensity;
    const finalPattern = this.scalePattern(pattern, scaledIntensity);

    try {
      navigator.vibrate(finalPattern);
      this.state.lastHapticTime = Date.now();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Singleton haptic engine instance
 */
let hapticEngineInstance: HapticEngine | null = null;

/**
 * Get or create haptic engine instance
 */
export function getHapticEngine(config?: Partial<HapticEngineConfig>): HapticEngine {
  if (!hapticEngineInstance) {
    hapticEngineInstance = new HapticEngine(config);
  } else if (config) {
    hapticEngineInstance.configure(config);
  }
  return hapticEngineInstance;
}

/**
 * Create a new haptic engine (alias for getHapticEngine for compatibility)
 */
export function createHapticEngine(config?: Partial<HapticEngineConfig>): HapticEngine {
  return getHapticEngine(config);
}

/**
 * Haptic pattern configuration type (alias for HapticEngineConfig)
 */
export type HapticPatternConfig = HapticEngineConfig;

/**
 * Map magnetic level to haptic intensity
 */
export function levelToIntensity(level: number): HapticIntensity {
  if (level >= 3) return 'heavy';
  if (level >= 2) return 'medium';
  if (level >= 1) return 'light';
  return 'none';
}

/**
 * Calculate intensity from normalized distance (0 = at center, 1 = at edge)
 */
export function distanceToIntensity(normalizedDistance: number): HapticIntensity {
  if (normalizedDistance <= 0.2) return 'heavy';
  if (normalizedDistance <= 0.5) return 'medium';
  if (normalizedDistance <= 0.8) return 'light';
  return 'none';
}

/**
 * Haptic feedback type (alias for MagneticHapticEvent)
 */
export type HapticFeedbackType = MagneticHapticEvent;

/**
 * Check if haptic API is supported
 */
export function isHapticSupported(): boolean {
  return typeof window !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Default haptic configuration
 */
export const DEFAULT_HAPTIC_CONFIG: HapticEngineConfig = {
  enabled: true,
  globalIntensity: 1.0,
  minInterval: 50,
  continuousPull: true,
  pullInterval: 100,
  respectReducedMotion: true,
};

/**
 * Exported haptic patterns for external use
 */
export const HAPTIC_PATTERNS = MAGNETIC_HAPTIC_PATTERNS;

export default HapticEngine;
