'use client';

/**
 * ScorePreviewOverlay Component
 *
 * Provides real-time visual feedback during criteria scoring.
 * Shows a themed mini-preview of the weighted score as users adjust criteria.
 * Includes threshold crossing animations and score quality indicators.
 */

import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { mapCategoryToTheme, type ThemeKey } from '@/lib/criteria/theme-mapping';

// Animation configuration
const ANIMATION_DURATION = 0.2;
const SPRING_CONFIG = { stiffness: 300, damping: 30 };
const THRESHOLD_ANIMATION_DURATION = 0.4;

// Score quality thresholds
const THRESHOLDS = {
  poor: 33,
  average: 50,
  good: 66,
  excellent: 85,
};

// Theme-specific colors
const THEME_COLORS: Record<ThemeKey, { primary: string; glow: string; bg: string }> = {
  sports: { primary: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', bg: 'rgba(34, 197, 94, 0.1)' },
  movies: { primary: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', bg: 'rgba(234, 179, 8, 0.1)' },
  music: { primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', bg: 'rgba(168, 85, 247, 0.1)' },
  games: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', bg: 'rgba(16, 185, 129, 0.1)' },
  default: { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', bg: 'rgba(6, 182, 212, 0.1)' },
};

// Score quality labels
const QUALITY_LABELS: Record<string, { label: string; color: string }> = {
  poor: { label: 'Poor', color: '#ef4444' },
  belowAverage: { label: 'Below Avg', color: '#f97316' },
  average: { label: 'Average', color: '#eab308' },
  good: { label: 'Good', color: '#22c55e' },
  excellent: { label: 'Excellent', color: '#10b981' },
};

/**
 * Get score quality based on score value
 */
function getScoreQuality(score: number): keyof typeof QUALITY_LABELS {
  if (score < THRESHOLDS.poor) return 'poor';
  if (score < THRESHOLDS.average) return 'belowAverage';
  if (score < THRESHOLDS.good) return 'average';
  if (score < THRESHOLDS.excellent) return 'good';
  return 'excellent';
}

export interface ScorePreviewOverlayProps {
  /** Current weighted score (0-100) */
  score: number;
  /** Previous score for threshold crossing detection */
  previousScore?: number;
  /** Category for theme detection */
  category?: string;
  /** Whether preview is active/visible */
  isActive?: boolean;
  /** Display size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show quality label */
  showQualityLabel?: boolean;
  /** Show threshold crossing animation */
  animateThresholdCrossing?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * ScorePreviewOverlay - Live preview of weighted score during scoring
 *
 * @example
 * ```tsx
 * <ScorePreviewOverlay
 *   score={75}
 *   category="Sports"
 *   isActive={true}
 *   showQualityLabel
 * />
 * ```
 */
export const ScorePreviewOverlay = memo(function ScorePreviewOverlay({
  score,
  previousScore,
  category,
  isActive = true,
  size = 'md',
  showQualityLabel = true,
  animateThresholdCrossing = true,
  className,
}: ScorePreviewOverlayProps) {
  const theme = mapCategoryToTheme(category);
  const colors = THEME_COLORS[theme];
  const quality = getScoreQuality(score);
  const qualityInfo = QUALITY_LABELS[quality];

  // Track threshold crossing
  const [thresholdPulse, setThresholdPulse] = useState(false);
  const prevScoreRef = useRef(previousScore ?? score);

  // Spring animation for smooth score updates
  const springScore = useSpring(score, SPRING_CONFIG);
  const displayScore = useTransform(springScore, (v) => Math.round(v));

  // Check for threshold crossing
  useEffect(() => {
    if (!animateThresholdCrossing) return;

    const prevQuality = getScoreQuality(prevScoreRef.current);
    const currentQuality = getScoreQuality(score);

    if (prevQuality !== currentQuality) {
      setThresholdPulse(true);
      setTimeout(() => setThresholdPulse(false), THRESHOLD_ANIMATION_DURATION * 1000);
    }

    prevScoreRef.current = score;
  }, [score, animateThresholdCrossing]);

  // Update spring when score changes
  useEffect(() => {
    springScore.set(score);
  }, [score, springScore]);

  // Size configuration
  const sizeConfig = {
    sm: { width: 80, height: 32, fontSize: 'text-xs', barHeight: 'h-1.5' },
    md: { width: 120, height: 48, fontSize: 'text-sm', barHeight: 'h-2' },
    lg: { width: 160, height: 64, fontSize: 'text-base', barHeight: 'h-3' },
  }[size];

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={cn(
            'relative rounded-lg overflow-hidden',
            'border backdrop-blur-md',
            className
          )}
          style={{
            width: sizeConfig.width,
            minHeight: sizeConfig.height,
            backgroundColor: colors.bg,
            borderColor: `${colors.primary}30`,
          }}
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: ANIMATION_DURATION }}
        >
          {/* Threshold crossing pulse effect */}
          <AnimatePresence>
            {thresholdPulse && !prefersReducedMotion && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{ backgroundColor: qualityInfo.color }}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: THRESHOLD_ANIMATION_DURATION }}
              />
            )}
          </AnimatePresence>

          <div className="relative p-2 flex flex-col gap-1">
            {/* Score display */}
            <div className="flex items-center justify-between">
              <motion.span
                className={cn('font-bold tabular-nums', sizeConfig.fontSize)}
                style={{ color: colors.primary }}
              >
                <motion.span>{displayScore}</motion.span>
              </motion.span>

              {/* Quality label */}
              {showQualityLabel && (
                <motion.span
                  key={quality}
                  className={cn('font-medium', size === 'sm' ? 'text-[10px]' : 'text-xs')}
                  style={{ color: qualityInfo.color }}
                  initial={prefersReducedMotion ? false : { opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {qualityInfo.label}
                </motion.span>
              )}
            </div>

            {/* Mini score bar */}
            <div
              className={cn(
                'relative w-full rounded-full overflow-hidden',
                sizeConfig.barHeight
              )}
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  backgroundColor: colors.primary,
                  boxShadow: `0 0 8px ${colors.glow}`,
                }}
                initial={prefersReducedMotion ? { width: `${score}%` } : { width: 0 }}
                animate={{ width: `${score}%` }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', ...SPRING_CONFIG }
                }
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

/**
 * MiniThemedPreview - Compact themed score preview for inline use
 *
 * Shows theme-specific mini visualization during active scoring
 */
export interface MiniThemedPreviewProps {
  /** Current score (0-100) */
  score: number;
  /** Category for theme detection */
  category?: string;
  /** Whether to animate the display */
  animated?: boolean;
  /** Additional class names */
  className?: string;
}

export const MiniThemedPreview = memo(function MiniThemedPreview({
  score,
  category,
  animated = true,
  className,
}: MiniThemedPreviewProps) {
  const theme = mapCategoryToTheme(category);

  // Reduced motion check
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const shouldAnimate = animated && !prefersReducedMotion;

  // Theme-specific mini previews
  switch (theme) {
    case 'sports':
      return <MiniSportsPreview score={score} animated={shouldAnimate} className={className} />;
    case 'movies':
      return <MiniMoviesPreview score={score} animated={shouldAnimate} className={className} />;
    case 'music':
      return <MiniMusicPreview score={score} animated={shouldAnimate} className={className} />;
    case 'games':
      return <MiniGamesPreview score={score} animated={shouldAnimate} className={className} />;
    default:
      return <MiniDefaultPreview score={score} animated={shouldAnimate} className={className} />;
  }
});

// Mini theme-specific previews

interface MiniPreviewProps {
  score: number;
  animated?: boolean;
  className?: string;
}

const MiniSportsPreview = memo(function MiniSportsPreview({
  score,
  animated,
  className,
}: MiniPreviewProps) {
  const getColor = () => {
    if (score < THRESHOLDS.poor) return '#ef4444';
    if (score < THRESHOLDS.good) return '#eab308';
    return '#22c55e';
  };

  return (
    <div className={cn('flex gap-0.5', className)}>
      {[0, 1, 2, 3, 4].map((i) => {
        const segmentThreshold = (i + 1) * 20;
        const filled = score >= segmentThreshold;
        const partial = !filled && score > i * 20;

        return (
          <motion.div
            key={i}
            className="w-2 h-3 rounded-[2px]"
            style={{
              backgroundColor: filled || partial ? getColor() : 'rgba(255,255,255,0.1)',
              opacity: partial ? 0.5 : 1,
            }}
            initial={animated ? { scaleY: 0 } : false}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
          />
        );
      })}
    </div>
  );
});

const MiniMoviesPreview = memo(function MiniMoviesPreview({
  score,
  animated,
  className,
}: MiniPreviewProps) {
  const starCount = 5;
  const starValue = (score / 100) * starCount;

  return (
    <div className={cn('flex gap-0.5', className)}>
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < Math.floor(starValue);
        const partial = !filled && i < starValue;

        return (
          <motion.svg
            key={i}
            className="w-3 h-3"
            viewBox="0 0 24 24"
            initial={animated ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 15 }}
          >
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill={filled ? '#eab308' : partial ? 'rgba(234, 179, 8, 0.4)' : 'rgba(255,255,255,0.1)'}
            />
          </motion.svg>
        );
      })}
    </div>
  );
});

const MiniMusicPreview = memo(function MiniMusicPreview({
  score,
  animated,
  className,
}: MiniPreviewProps) {
  // Equalizer bars with varying heights based on score
  const barHeights = [0.6, 1, 0.8, 0.9, 0.7].map((h) => h * (score / 100));

  return (
    <div className={cn('flex items-end gap-0.5 h-4', className)}>
      {barHeights.map((height, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-t-sm"
          style={{
            background: `linear-gradient(to top, #7c3aed, #3b82f6)`,
            height: `${Math.max(height * 100, 15)}%`,
          }}
          initial={animated ? { height: 0 } : false}
          animate={{ height: `${Math.max(height * 100, 15)}%` }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        />
      ))}
    </div>
  );
});

const MiniGamesPreview = memo(function MiniGamesPreview({
  score,
  animated,
  className,
}: MiniPreviewProps) {
  const level = Math.floor(score / 10) + 1;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div
        className="relative w-10 h-2 rounded-sm overflow-hidden"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{
            background: 'linear-gradient(to right, #059669, #10b981)',
            boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)',
          }}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${score}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />
      </div>
      <span className="text-[10px] font-bold text-emerald-400">L{Math.min(level, 10)}</span>
    </div>
  );
});

const MiniDefaultPreview = memo(function MiniDefaultPreview({
  score,
  animated,
  className,
}: MiniPreviewProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div
        className="relative w-12 h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)' }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: 'linear-gradient(to right, #0891b2, #06b6d4)',
            boxShadow: '0 0 6px rgba(6, 182, 212, 0.4)',
          }}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${score}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />
      </div>
      <span className="text-[10px] font-medium text-brand-hover tabular-nums">{Math.round(score)}</span>
    </div>
  );
});

export default ScorePreviewOverlay;
