/**
 * Haptics Library Exports
 */

export {
  HapticEngine,
  createHapticEngine,
  isHapticSupported as isHapticAPISupported,
  DEFAULT_HAPTIC_CONFIG,
  HAPTIC_PATTERNS,
} from './hapticEngine';

export type {
  HapticIntensity,
  HapticFeedbackType,
  HapticPatternConfig,
  HapticEngineConfig,
  MagneticHapticState,
} from './hapticEngine';
