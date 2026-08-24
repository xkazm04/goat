"use client";

import { CSSProperties, ReactNode, useMemo, useEffect, useState } from "react";

import { useRankingProgress, type ProgressTier } from "@/hooks/use-ranking-progress";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { cn } from "@/lib/utils";

interface RankingProgressLayerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Interpolates between two values based on normalized progress (0-1).
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

/**
 * Computes CSS custom properties that react to ranking progress.
 * These override the Glass Dock tokens as progress increases.
 */
function useProgressTokens(normalized: number, tier: ProgressTier, reduceAmbient: boolean) {
  return useMemo(() => {
    // Glass morphism intensity ramps up with progress
    const blurIntensity = lerp(24, 40, normalized);
    const borderLuminosity = lerp(0.05, 0.25, normalized);
    const shadowGlowOpacity = lerp(0.2, 0.6, normalized);
    const shadowGlowSpread = lerp(20, 40, normalized);

    // Animation speed multiplier (1x idle -> 2x at complete)
    const animSpeed = reduceAmbient ? 1 : lerp(1, 0.5, normalized); // lower = faster duration

    // Badge color temperature: cool cyan -> warm gold
    // We shift hue from 187 (cyan) toward 45 (gold)
    const badgeHue = lerp(187, 45, normalized);
    const badgeSaturation = lerp(72, 85, normalized);
    const badgeLightness = lerp(56, 60, normalized);

    return {
      "--rp-blur": `${blurIntensity}px`,
      "--rp-border-lum": borderLuminosity.toFixed(3),
      "--rp-glow-opacity": shadowGlowOpacity.toFixed(3),
      "--rp-glow-spread": `${shadowGlowSpread}px`,
      "--rp-anim-speed": animSpeed.toFixed(3),
      "--rp-badge-hue": `${badgeHue}`,
      "--rp-badge-sat": `${badgeSaturation}%`,
      "--rp-badge-light": `${badgeLightness}%`,
      "--rp-normalized": normalized.toFixed(3),
      "--rp-percentage": `${Math.round(normalized * 100)}`,

      // Override core glass tokens reactively
      "--glass-blur": `${blurIntensity}px`,
      "--glass-blur-heavy": `${lerp(32, 48, normalized)}px`,
      "--glass-border-medium": `rgba(255, 255, 255, ${borderLuminosity.toFixed(3)})`,
      "--glass-border-emphasis": `rgba(255, 255, 255, ${lerp(0.15, 0.35, normalized).toFixed(3)})`,
      "--glass-shadow-glow": `0 0 ${shadowGlowSpread}px rgb(var(--brand-rgb) / ${shadowGlowOpacity.toFixed(2)})`,
      "--glass-shadow-glow-active": `0 0 ${lerp(24, 48, normalized)}px rgb(var(--brand-rgb) / ${lerp(0.35, 0.7, normalized).toFixed(2)})`,

      // Ambient animation duration multipliers
      "--float-duration": `${lerp(15, 7, normalized)}s`,
      "--particle-duration": `${lerp(3.5, 1.8, normalized)}s`,
    } as CSSProperties;
  }, [normalized, tier, reduceAmbient]);
}

/**
 * RankingProgressLayer
 *
 * Wraps the match grid and injects CSS custom properties that
 * react to ranking progress. As users fill grid positions:
 * - Glass morphism intensifies (blur, border luminosity, shadow glow)
 * - Ambient animations accelerate
 * - Badge colors shift from cool cyan to warm gold
 * - At 100%, a completion celebration cascade triggers
 *
 * Respects prefers-reduced-motion via the 3-tier motion system.
 */
export function RankingProgressLayer({ children, className }: RankingProgressLayerProps) {
  const { normalized, tier, isComplete, percentage } = useRankingProgress();
  // Use the 3-tier motion system (the deprecated useReducedMotion only checked the
  // OS media query and ignored the in-app tier — so its localStorage preference
  // and the [data-motion-tier] CSS guards in globals.css never engaged here).
  const { tier: motionTier, capabilities } = useMotionPreference();
  const { allowAmbient, allowCelebrations } = capabilities;
  const tokens = useProgressTokens(normalized, tier, !allowAmbient);

  // Celebration state: triggers once when completion is first reached
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDone, setCelebrationDone] = useState(false);

  useEffect(() => {
    if (isComplete && !celebrationDone && allowCelebrations) {
      setShowCelebration(true);
      // Auto-dismiss celebration after 3s
      const timer = setTimeout(() => {
        setShowCelebration(false);
        setCelebrationDone(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
    // Reset celebration state when grid becomes incomplete again (user removed an item)
    if (!isComplete && celebrationDone) {
      setCelebrationDone(false);
    }
  }, [isComplete, celebrationDone, allowCelebrations]);

  return (
    <div
      className={cn("ranking-progress-layer", className)}
      data-motion-tier={motionTier}
      data-ranking-tier={tier}
      data-ranking-complete={isComplete ? "true" : undefined}
      data-ranking-celebrating={showCelebration ? "true" : undefined}
      style={tokens}
    >
      {children}

      {/* Completion celebration overlay */}
      {showCelebration && (
        <div className="rp-celebration-overlay" aria-hidden="true">
          <div className="rp-celebration-border" />
          <div className="rp-celebration-glow" />
          <div className="rp-celebration-shimmer" />
        </div>
      )}
    </div>
  );
}
