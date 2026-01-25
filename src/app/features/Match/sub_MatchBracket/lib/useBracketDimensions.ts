"use client";

import { useState, useEffect, useMemo } from 'react';

/**
 * Dynamic dimensions for bracket UI elements based on viewport
 * Returns responsive sizes that scale smoothly with screen size
 */
export interface BracketDimensions {
  // Matchup screen participant cards
  cardWidth: number;
  cardMaxWidth: number;
  cardGap: number;
  imageAspect: number;
  imageMaxHeight: number;

  // VS divider
  vsDividerSize: number;

  // Bracket visualization (tree view)
  matchupWidth: number;
  matchupHeight: number;
  verticalGap: number;
  roundGap: number;

  // General scale factor (0-1)
  scale: number;

  // Breakpoint flags
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Hook to calculate responsive dimensions for bracket components
 */
export function useBracketDimensions(): BracketDimensions {
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const update = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return useMemo(() => {
    const { width: vw, height: vh } = viewport;

    // Breakpoint detection
    const isMobile = vw < 640;
    const isTablet = vw >= 640 && vw < 1024;
    const isDesktop = vw >= 1024;

    // Scale factor based on viewport
    const scale = Math.min(1, Math.max(0.5, vw / 1400));

    // Matchup screen dimensions - cards should fill available space
    // On mobile: cards stack or are very compact
    // On desktop: cards take ~35-40% of width each
    const cardWidth = isMobile
      ? Math.min(vw * 0.42, 180)
      : isTablet
        ? Math.min(vw * 0.35, 280)
        : Math.min(vw * 0.28, 320);

    const cardMaxWidth = isDesktop ? 360 : 280;
    const cardGap = isMobile ? 8 : isTablet ? 16 : 24;

    // Image aspect ratio - taller on desktop, more square on mobile
    const imageAspect = isMobile ? 1.1 : isTablet ? 1.2 : 1.25;

    // Max image height as percentage of viewport
    const imageMaxHeight = isMobile
      ? vh * 0.35
      : isTablet
        ? vh * 0.45
        : vh * 0.5;

    // VS divider size
    const vsDividerSize = isMobile ? 40 : isTablet ? 56 : 72;

    // Bracket visualization dimensions
    const matchupWidth = Math.min(180, Math.max(100, vw * 0.1));
    const matchupHeight = Math.min(72, Math.max(48, vh * 0.07));
    const verticalGap = Math.min(16, Math.max(6, vh * 0.012));
    const roundGap = Math.min(80, Math.max(32, vw * 0.035));

    return {
      cardWidth,
      cardMaxWidth,
      cardGap,
      imageAspect,
      imageMaxHeight,
      vsDividerSize,
      matchupWidth,
      matchupHeight,
      verticalGap,
      roundGap,
      scale,
      isMobile,
      isTablet,
      isDesktop,
    };
  }, [viewport]);
}

/**
 * CSS variable style object for use in components
 */
export function useBracketCSSVars(): React.CSSProperties {
  const dims = useBracketDimensions();

  return useMemo(() => ({
    '--bracket-card-width': `${dims.cardWidth}px`,
    '--bracket-card-max-width': `${dims.cardMaxWidth}px`,
    '--bracket-card-gap': `${dims.cardGap}px`,
    '--bracket-image-aspect': dims.imageAspect,
    '--bracket-image-max-height': `${dims.imageMaxHeight}px`,
    '--bracket-vs-size': `${dims.vsDividerSize}px`,
    '--bracket-matchup-width': `${dims.matchupWidth}px`,
    '--bracket-matchup-height': `${dims.matchupHeight}px`,
    '--bracket-scale': dims.scale,
  } as React.CSSProperties), [dims]);
}
