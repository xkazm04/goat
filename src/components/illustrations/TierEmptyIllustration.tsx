'use client';

import { memo } from 'react';

/**
 * SVG illustrations for empty tier rows.
 * Each tier level gets a themed icon that uses the tier's color as a tint.
 */

interface TierEmptyIllustrationProps {
  /** Tier label (S, A, B, C, D, F or extended variants) */
  tierLabel: string;
  /** Primary tier color for tinting */
  color: string;
  /** Whether the tier is currently being hovered during drag */
  isHighlighted?: boolean;
}

/** Trophy outline for S-tier */
function TrophySVG({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 6h12v10c0 3.314-2.686 6-6 6s-6-2.686-6-6V6z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <path
        d="M10 9H7c0 3 2 5 3 5.5M22 9h3c0 3-2 5-3 5.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <path
        d="M13 22v2h6v-2M12 26h8"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
    </svg>
  );
}

/** Ribbon/medal for A-tier */
function RibbonSVG({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="16"
        cy="14"
        r="7"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.5"
      />
      <circle
        cx="16"
        cy="14"
        r="4"
        stroke={color}
        strokeWidth="1"
        opacity="0.3"
      />
      <path
        d="M12 20l-2 8 4-2 2 3 1-6M20 20l2 8-4-2-2 3-1-6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
    </svg>
  );
}

/** Scattered stars for B-tier */
function StarsSVG({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 6l1.8 3.6 4 .6-2.9 2.8.7 4L16 15l-3.6 2 .7-4-2.9-2.8 4-.6L16 6z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <path
        d="M7 20l.9 1.8 2 .3-1.4 1.4.3 2L7 24.5l-1.8 1 .3-2-1.4-1.4 2-.3L7 20z"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.3"
      />
      <path
        d="M25 18l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3L25 18z"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.3"
      />
    </svg>
  );
}

/** Shield/chevron for C-tier */
function ShieldSVG({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 4L6 9v7c0 6.5 4.3 10.5 10 13 5.7-2.5 10-6.5 10-13V9L16 4z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.4"
      />
      <path
        d="M13 15l2 2 4-4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />
    </svg>
  );
}

/** Down arrow for D-tier */
function ArrowSVG({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="16"
        cy="16"
        r="10"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.3"
      />
      <path
        d="M16 10v10M12 17l4 4 4-4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
    </svg>
  );
}

/** Broken circle for F-tier */
function FragmentSVG({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 6a10 10 0 0 1 8.66 5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />
      <path
        d="M26 16a10 10 0 0 1-5 8.66"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.25"
      />
      <path
        d="M16 26a10 10 0 0 1-8.66-5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.2"
      />
      <path
        d="M6 16a10 10 0 0 1 5-8.66"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.15"
      />
      <path
        d="M14 14l4 4M18 14l-4 4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

/** Map tier label to base tier for illustration selection */
function getBaseTier(label: string): string {
  const upper = label.toUpperCase().replace(/[+-]$/, '');
  if (upper === 'S') return 'S';
  if (upper === 'A') return 'A';
  if (upper === 'B') return 'B';
  if (upper === 'C') return 'C';
  if (upper === 'D') return 'D';
  return 'F';
}

/** Get the illustration component for a tier */
function getIllustration(baseTier: string, color: string) {
  switch (baseTier) {
    case 'S': return <TrophySVG color={color} />;
    case 'A': return <RibbonSVG color={color} />;
    case 'B': return <StarsSVG color={color} />;
    case 'C': return <ShieldSVG color={color} />;
    case 'D': return <ArrowSVG color={color} />;
    default:  return <FragmentSVG color={color} />;
  }
}

/** Get hint text for each tier */
function getHintText(baseTier: string): string {
  switch (baseTier) {
    case 'S': return 'Place your legends here';
    case 'A': return 'Drop your top picks here';
    case 'B': return 'Add solid contenders here';
    case 'C': return 'Drag average picks here';
    case 'D': return 'Place lower picks here';
    default:  return 'Drop remaining items here';
  }
}

export const TierEmptyIllustration = memo(function TierEmptyIllustration({
  tierLabel,
  color,
  isHighlighted = false,
}: TierEmptyIllustrationProps) {
  const baseTier = getBaseTier(tierLabel);

  if (isHighlighted) {
    return (
      <div className="flex items-center gap-2">
        {getIllustration(baseTier, color)}
        <span style={{ color }} className="text-xs font-medium opacity-80">
          Drop here
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 opacity-60 hover:opacity-80 transition-opacity">
      {getIllustration(baseTier, color)}
      <span className="text-xs text-slate-500">
        {getHintText(baseTier)}
      </span>
    </div>
  );
});

export default TierEmptyIllustration;
