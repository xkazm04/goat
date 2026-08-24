'use client';

import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Empty trophy case with shelves - for "no items" states
 * Cyan-to-purple gradient palette on dark background
 */
export function EmptyTrophyCase({ className, width = 200, height = 160 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      {/* Glow background */}
      <defs>
        <radialGradient id="trophy-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="shelf-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#a855f7" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="case-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="80" r="70" fill="url(#trophy-glow)" />

      {/* Trophy case frame */}
      <rect x="40" y="20" width="120" height="120" rx="6" fill="url(#case-gradient)" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" />

      {/* Shelves */}
      <line x1="50" y1="60" x2="150" y2="60" stroke="url(#shelf-gradient)" strokeWidth="2" />
      <line x1="50" y1="100" x2="150" y2="100" stroke="url(#shelf-gradient)" strokeWidth="2" />

      {/* Shelf depth lines */}
      <line x1="50" y1="60" x2="50" y2="63" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" />
      <line x1="150" y1="60" x2="150" y2="63" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" />
      <line x1="50" y1="100" x2="50" y2="103" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" />
      <line x1="150" y1="100" x2="150" y2="103" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" />

      {/* Ghost trophy outline on middle shelf */}
      <g opacity="0.12">
        <path d="M90 85h-4a4 4 0 0 1-4-4v-6h8z" stroke="#22d3ee" strokeWidth="1" fill="none" />
        <path d="M110 85h4a4 4 0 0 0 4-4v-6h-8z" stroke="#22d3ee" strokeWidth="1" fill="none" />
        <path d="M92 85h16l-2 12H94z" stroke="#22d3ee" strokeWidth="1" fill="none" strokeDasharray="3 3" />
        <line x1="95" y1="97" x2="105" y2="97" stroke="#22d3ee" strokeWidth="1" />
      </g>

      {/* Sparkle particles */}
      <circle cx="70" cy="45" r="1.5" fill="#22d3ee" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="130" cy="50" r="1" fill="#a855f7" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="80" cy="115" r="1" fill="#22d3ee" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Magnifying glass with sparkle trails - for "no search results" states
 */
export function NoSearchResults({ className, width = 200, height = 160 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="search-glow" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lens-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <circle cx="95" cy="72" r="65" fill="url(#search-glow)" />

      {/* Magnifying glass lens */}
      <circle cx="88" cy="65" r="28" stroke="url(#lens-gradient)" strokeWidth="3" fill="none" />
      <circle cx="88" cy="65" r="24" stroke="#22d3ee" strokeOpacity="0.08" strokeWidth="1" fill="none" />

      {/* Glass reflection */}
      <path d="M72 50a22 22 0 0 1 20-12" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Handle */}
      <line x1="110" y1="87" x2="135" y2="112" stroke="#22d3ee" strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" />
      <line x1="110" y1="87" x2="135" y2="112" stroke="#a855f7" strokeOpacity="0.15" strokeWidth="6" strokeLinecap="round" />

      {/* Question mark inside lens */}
      <text x="88" y="72" textAnchor="middle" fill="#22d3ee" fillOpacity="0.2" fontSize="24" fontFamily="Space Grotesk, sans-serif" fontWeight="600">?</text>

      {/* Sparkle trail particles */}
      <circle cx="55" cy="42" r="2" fill="#22d3ee" opacity="0.35">
        <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2s" repeatCount="indefinite" />
        <animate attributeName="r" values="2;1.5;2" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="65" cy="35" r="1.5" fill="#a855f7" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="48" cy="55" r="1" fill="#22d3ee" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="3.5s" repeatCount="indefinite" />
      </circle>

      {/* Star sparkles */}
      <path d="M140 40l2 4 2-4-4 2 4 2z" fill="#22d3ee" fillOpacity="0.25">
        <animate attributeName="fill-opacity" values="0.25;0.08;0.25" dur="2.5s" repeatCount="indefinite" />
      </path>
      <path d="M45 95l1.5 3 1.5-3-3 1.5 3 1.5z" fill="#a855f7" fillOpacity="0.2">
        <animate attributeName="fill-opacity" values="0.2;0.05;0.2" dur="3s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

/**
 * Crown resting on question mark - for "no metadata" states
 */
export function NoMetadata({ className, width = 80, height = 64 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 80 64"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <linearGradient id="crown-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Question mark */}
      <text x="40" y="50" textAnchor="middle" fill="#22d3ee" fillOpacity="0.15" fontSize="36" fontFamily="Space Grotesk, sans-serif" fontWeight="700">?</text>

      {/* Crown on top */}
      <path d="M25 22l5-10 5 7 5-7 5 7 5-7 5 10z" stroke="url(#crown-gradient)" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <line x1="25" y1="22" x2="55" y2="22" stroke="#22d3ee" strokeOpacity="0.3" strokeWidth="1.5" />

      {/* Crown jewels */}
      <circle cx="30" cy="19" r="1" fill="#22d3ee" opacity="0.4" />
      <circle cx="40" cy="16" r="1.2" fill="#a855f7" opacity="0.4" />
      <circle cx="50" cy="19" r="1" fill="#22d3ee" opacity="0.4" />

      {/* Sparkles */}
      <circle cx="18" cy="15" r="1" fill="#22d3ee" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="62" cy="18" r="0.8" fill="#a855f7" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Film reel with dotted film strip - for movies/tv empty states
 */
export function EmptyFilmReel({ className, width = 140, height = 112 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="film-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="reel-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="80" r="65" fill="url(#film-glow)" />

      {/* Film reel outer ring */}
      <circle cx="100" cy="76" r="36" stroke="url(#reel-gradient)" strokeWidth="2.5" fill="none" />
      <circle cx="100" cy="76" r="30" stroke="#22d3ee" strokeOpacity="0.1" strokeWidth="1" fill="none" />

      {/* Center hub */}
      <circle cx="100" cy="76" r="8" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
      <circle cx="100" cy="76" r="3" fill="#a855f7" opacity="0.3" />

      {/* Reel spokes */}
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 100 + Math.cos(rad) * 10;
        const y1 = 76 + Math.sin(rad) * 10;
        const x2 = 100 + Math.cos(rad) * 28;
        const y2 = 76 + Math.sin(rad) * 28;
        return (
          <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#22d3ee" strokeOpacity="0.12" strokeWidth="1" />
        );
      })}

      {/* Film strip coming off reel */}
      <path d="M136 76 C145 76, 150 82, 155 90 L160 100" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M136 76 C145 76, 150 82, 155 90 L160 100" stroke="#a855f7" strokeOpacity="0.1" strokeWidth="12" strokeLinecap="round" fill="none" />

      {/* Film perforations */}
      <rect x="139" y="72" width="3" height="3" rx="0.5" fill="#22d3ee" opacity="0.2" />
      <rect x="146" y="76" width="3" height="3" rx="0.5" fill="#22d3ee" opacity="0.18" />
      <rect x="152" y="84" width="3" height="3" rx="0.5" fill="#22d3ee" opacity="0.15" />

      {/* Sparkles */}
      <circle cx="60" cy="50" r="1.5" fill="#22d3ee" opacity="0.35">
        <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="145" cy="55" r="1" fill="#a855f7" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="70" cy="110" r="1" fill="#22d3ee" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="3.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Vinyl record with tonearm - for music empty states
 */
export function EmptyVinylRecord({ className, width = 140, height = 112 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="vinyl-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vinyl-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <circle cx="95" cy="80" r="65" fill="url(#vinyl-glow)" />

      {/* Record outer */}
      <circle cx="92" cy="80" r="38" stroke="url(#vinyl-gradient)" strokeWidth="2" fill="none" />

      {/* Grooves */}
      <circle cx="92" cy="80" r="32" stroke="#22d3ee" strokeOpacity="0.06" strokeWidth="0.5" fill="none" />
      <circle cx="92" cy="80" r="27" stroke="#a855f7" strokeOpacity="0.06" strokeWidth="0.5" fill="none" />
      <circle cx="92" cy="80" r="22" stroke="#22d3ee" strokeOpacity="0.08" strokeWidth="0.5" fill="none" />
      <circle cx="92" cy="80" r="17" stroke="#a855f7" strokeOpacity="0.06" strokeWidth="0.5" fill="none" />

      {/* Label center */}
      <circle cx="92" cy="80" r="12" stroke="#a855f7" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      <circle cx="92" cy="80" r="3" fill="#22d3ee" opacity="0.3" />

      {/* Tonearm */}
      <line x1="140" y1="40" x2="140" y2="48" stroke="#22d3ee" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
      <line x1="140" y1="48" x2="115" y2="72" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="140" cy="40" r="3" stroke="#a855f7" strokeOpacity="0.25" strokeWidth="1" fill="none" />

      {/* Needle tip glow */}
      <circle cx="115" cy="72" r="2" fill="#22d3ee" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Sparkles */}
      <circle cx="50" cy="50" r="1.5" fill="#a855f7" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="150" cy="100" r="1" fill="#22d3ee" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="3.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="115" r="1" fill="#a855f7" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Game controller outline - for games empty states
 */
export function EmptyGameController({ className, width = 140, height = 112 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="game-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="controller-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="80" r="65" fill="url(#game-glow)" />

      {/* Controller body */}
      <path
        d="M60 70 C60 58, 75 52, 100 52 C125 52, 140 58, 140 70 L145 95 C146 102, 140 108, 133 108 L125 108 C120 108, 116 104, 115 100 L112 90 C110 86, 108 84, 100 84 C92 84, 90 86, 88 90 L85 100 C84 104, 80 108, 75 108 L67 108 C60 108, 54 102, 55 95 Z"
        stroke="url(#controller-gradient)"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />

      {/* D-pad */}
      <rect x="72" y="66" width="4" height="14" rx="1" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" fill="none" />
      <rect x="67" y="71" width="14" height="4" rx="1" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" fill="none" />

      {/* Action buttons */}
      <circle cx="122" cy="66" r="3" stroke="#a855f7" strokeOpacity="0.2" strokeWidth="1" fill="none" />
      <circle cx="130" cy="73" r="3" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" fill="none" />
      <circle cx="122" cy="80" r="3" stroke="#a855f7" strokeOpacity="0.15" strokeWidth="1" fill="none" />
      <circle cx="114" cy="73" r="3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" fill="none" />

      {/* Center button */}
      <rect x="94" y="64" width="12" height="6" rx="3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" fill="none" />

      {/* Sparkles */}
      <circle cx="55" cy="48" r="1.5" fill="#22d3ee" opacity="0.35">
        <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="148" cy="52" r="1" fill="#a855f7" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="125" r="1" fill="#22d3ee" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="3.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Category-aware empty state component
 * Selects the appropriate illustration based on the category string
 */
export function CategoryEmptyState({
  category,
  className,
  width = 140,
  height = 112,
}: IllustrationProps & { category?: string }) {
  const cat = (category || '').toLowerCase();

  if (cat.includes('movie') || cat.includes('film') || cat.includes('tv') || cat.includes('anime') || cat.includes('show')) {
    return <EmptyFilmReel className={className} width={width} height={height} />;
  }
  if (cat.includes('music') || cat.includes('album') || cat.includes('song') || cat.includes('artist') || cat.includes('band')) {
    return <EmptyVinylRecord className={className} width={width} height={height} />;
  }
  if (cat.includes('game') || cat.includes('gaming') || cat.includes('video game')) {
    return <EmptyGameController className={className} width={width} height={height} />;
  }
  // Default: trophy case for sports and everything else
  return <EmptyTrophyCase className={className} width={width} height={height} />;
}

/**
 * Toppled trophy - for error states
 * Larger 120x120 illustration with cyan/purple accent glows
 */
export function ToppledTrophy({ className, width = 120, height = 120 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="error-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
          <stop offset="70%" stopColor="#a855f7" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="trophy-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="60" r="55" fill="url(#error-glow)" />

      {/* Toppled trophy - rotated ~30deg */}
      <g transform="translate(60, 65) rotate(25)">
        {/* Cup body */}
        <path d="M-12 -20h24l-4 22H-8z" stroke="url(#trophy-body)" strokeWidth="2" fill="none" strokeLinejoin="round" />
        {/* Left handle */}
        <path d="M-12 -18h-4a5 5 0 0 0 0 10h4" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
        {/* Right handle */}
        <path d="M12 -18h4a5 5 0 0 1 0 10h-4" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
        {/* Stem */}
        <line x1="0" y1="2" x2="0" y2="12" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="2" />
        {/* Base */}
        <line x1="-8" y1="12" x2="8" y2="12" stroke="#22d3ee" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Impact lines */}
      <line x1="85" y1="85" x2="95" y2="90" stroke="#f59e0b" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="88" y1="78" x2="96" y2="80" stroke="#f59e0b" strokeOpacity="0.2" strokeWidth="1" strokeLinecap="round" />
      <line x1="82" y1="90" x2="90" y2="96" stroke="#f59e0b" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" />

      {/* Scattered stars */}
      <circle cx="30" cy="35" r="2" fill="#22d3ee" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="90" cy="40" r="1.5" fill="#a855f7" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.08;0.25" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="35" cy="90" r="1" fill="#22d3ee" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Compact 48x48 category-aware illustrations for empty grid slots.
 * Uses cyan (#22d3ee) stroke on dark background for the neon aesthetic.
 */

function SlotFilmReel() {
  return (
    <svg viewBox="0 0 48 48" width={48} height={48} fill="none" className="opacity-60">
      <circle cx="24" cy="24" r="14" stroke="#22d3ee" strokeWidth="1.5" strokeOpacity="0.3" />
      <circle cx="24" cy="24" r="10" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.15" />
      <circle cx="24" cy="24" r="4" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.25" />
      <circle cx="24" cy="24" r="1.5" fill="#22d3ee" opacity="0.3" />
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const r = (a * Math.PI) / 180;
        return <line key={a} x1={24 + Math.cos(r) * 5} y1={24 + Math.sin(r) * 5} x2={24 + Math.cos(r) * 9} y2={24 + Math.sin(r) * 9} stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="0.75" />;
      })}
    </svg>
  );
}

function SlotVinylRecord() {
  return (
    <svg viewBox="0 0 48 48" width={48} height={48} fill="none" className="opacity-60">
      <circle cx="24" cy="24" r="15" stroke="#22d3ee" strokeWidth="1.5" strokeOpacity="0.3" />
      <circle cx="24" cy="24" r="12" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.1" />
      <circle cx="24" cy="24" r="9" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.08" />
      <circle cx="24" cy="24" r="5" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.2" />
      <circle cx="24" cy="24" r="1.5" fill="#22d3ee" opacity="0.35" />
      <line x1="38" y1="10" x2="38" y2="14" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="38" y1="14" x2="30" y2="21" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function SlotTrophy() {
  return (
    <svg viewBox="0 0 48 48" width={48} height={48} fill="none" className="opacity-60">
      <path d="M17 14h14l-2.5 14h-9z" stroke="#22d3ee" strokeWidth="1.5" strokeOpacity="0.3" strokeLinejoin="round" />
      <path d="M17 16h-3a3 3 0 0 0 0 6h3" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.2" />
      <path d="M31 16h3a3 3 0 0 1 0 6h-3" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.2" />
      <line x1="24" y1="28" x2="24" y2="33" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.2" />
      <line x1="19" y1="33" x2="29" y2="33" stroke="#22d3ee" strokeWidth="1.5" strokeOpacity="0.25" strokeLinecap="round" />
    </svg>
  );
}

function SlotGameController() {
  return (
    <svg viewBox="0 0 48 48" width={48} height={48} fill="none" className="opacity-60">
      <path
        d="M14 22c0-5 6-8 10-8s10 3 10 8l2 8c0 3-2 5-4 5h-3c-1 0-2-1-3-3l-1-2c-1-1-1-1-2 0l-1 2c-1 2-2 3-3 3h-3c-2 0-4-2-4-5z"
        stroke="#22d3ee" strokeWidth="1.5" strokeOpacity="0.3" strokeLinejoin="round"
      />
      <rect x="17" y="21" width="2" height="6" rx="0.5" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="0.75" />
      <rect x="15" y="23" width="6" height="2" rx="0.5" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="0.75" />
      <circle cx="31" cy="21" r="1.5" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="0.75" />
      <circle cx="34" cy="24" r="1.5" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="0.75" />
    </svg>
  );
}

/**
 * Goat peering through a magnifying glass - for "no filter results" states
 */
export function GoatSearching({ className, width = 120, height = 96 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="goat-search-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goat-search-lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="48" r="45" fill="url(#goat-search-glow)" />
      {/* Magnifying glass */}
      <circle cx="52" cy="42" r="18" stroke="url(#goat-search-lens)" strokeWidth="2.5" fill="none" />
      <line x1="65" y1="55" x2="82" y2="72" stroke="#22d3ee" strokeOpacity="0.3" strokeWidth="3.5" strokeLinecap="round" />
      {/* Goat head peering from behind */}
      <ellipse cx="50" cy="40" rx="10" ry="12" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      {/* Horns */}
      <path d="M42 32c-3-6-1-12 2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M58 32c3-6 1-12-2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Eyes */}
      <circle cx="46" cy="38" r="1.5" fill="#22d3ee" opacity="0.4" />
      <circle cx="54" cy="38" r="1.5" fill="#22d3ee" opacity="0.4" />
      {/* Nose */}
      <ellipse cx="50" cy="44" rx="3" ry="2" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" fill="none" />
      {/* Ears */}
      <path d="M39 34c-4-2-6 0-5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M61 34c4-2 6 0 5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Sparkles */}
      <circle cx="25" cy="25" r="1.5" fill="#22d3ee" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="90" cy="30" r="1" fill="#a855f7" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Goat holding a bookmark/ribbon - for "no saved presets" states
 */
export function GoatBookmark({ className, width = 120, height = 96 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="goat-bm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goat-bm-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="48" r="45" fill="url(#goat-bm-glow)" />
      {/* Goat body silhouette */}
      <ellipse cx="55" cy="50" rx="14" ry="16" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      {/* Horns */}
      <path d="M46 38c-4-7-2-14 1-16" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M64 38c4-7 2-14-1-16" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Eyes */}
      <circle cx="50" cy="46" r="1.5" fill="#22d3ee" opacity="0.4" />
      <circle cx="60" cy="46" r="1.5" fill="#22d3ee" opacity="0.4" />
      {/* Nose */}
      <ellipse cx="55" cy="53" rx="3" ry="2" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" fill="none" />
      {/* Ears */}
      <path d="M43 40c-4-2-7 0-5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M67 40c4-2 7 0 5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Bookmark ribbon held by goat */}
      <path d="M72 30v38l-6-5-6 5V30z" stroke="url(#goat-bm-ribbon)" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      {/* Star on bookmark */}
      <path d="M66 42l1.5 3 1.5-3-3 1.5 3 1.5z" fill="#22d3ee" fillOpacity="0.3" />
      {/* Hoof holding bookmark */}
      <path d="M65 55c3-2 6-4 7-8" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Sparkles */}
      <circle cx="30" cy="25" r="1.5" fill="#22d3ee" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="95" cy="60" r="1" fill="#a855f7" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="3.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Goat with building blocks - for "empty filter group" states
 */
export function GoatBlocks({ className, width = 120, height = 96 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="goat-blocks-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goat-block-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="48" r="45" fill="url(#goat-blocks-glow)" />
      {/* Goat head */}
      <ellipse cx="40" cy="42" rx="10" ry="12" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      {/* Horns */}
      <path d="M32 34c-3-6-1-12 2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M48 34c3-6 1-12-2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Eyes */}
      <circle cx="36" cy="40" r="1.5" fill="#22d3ee" opacity="0.4" />
      <circle cx="44" cy="40" r="1.5" fill="#22d3ee" opacity="0.4" />
      {/* Nose */}
      <ellipse cx="40" cy="47" rx="3" ry="2" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" fill="none" />
      {/* Ears */}
      <path d="M29 36c-4-2-6 0-5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M51 36c4-2 6 0 5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Building blocks stacked */}
      <rect x="62" y="55" width="16" height="14" rx="2" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1.5" fill="url(#goat-block-fill)" />
      <rect x="66" y="41" width="16" height="14" rx="2" stroke="#a855f7" strokeOpacity="0.25" strokeWidth="1.5" fill="url(#goat-block-fill)" />
      <rect x="70" y="27" width="16" height="14" rx="2" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1.5" fill="url(#goat-block-fill)" />
      {/* Plus signs on blocks */}
      <line x1="70" y1="60" x2="70" y2="66" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" />
      <line x1="67" y1="63" x2="73" y2="63" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" />
      <line x1="74" y1="46" x2="74" y2="52" stroke="#a855f7" strokeOpacity="0.2" strokeWidth="1" />
      <line x1="71" y1="49" x2="77" y2="49" stroke="#a855f7" strokeOpacity="0.2" strokeWidth="1" />
      {/* Hoof reaching toward blocks */}
      <path d="M48 52c5 2 10 4 14 6" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Sparkles */}
      <circle cx="20" cy="25" r="1.5" fill="#22d3ee" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="95" cy="35" r="1" fill="#a855f7" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Goat looking confused at an empty funnel - for "no filters matching" states
 */
export function GoatFilterEmpty({ className, width = 120, height = 96 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="goat-filter-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goat-funnel-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="48" r="45" fill="url(#goat-filter-glow)" />
      {/* Funnel shape */}
      <path d="M68 28l20 0-12 22v14" stroke="url(#goat-funnel-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M88 28l-8 0" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1.5" />
      <line x1="76" y1="64" x2="76" y2="70" stroke="#a855f7" strokeOpacity="0.15" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
      {/* Goat head */}
      <ellipse cx="42" cy="44" rx="10" ry="12" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      {/* Horns */}
      <path d="M34 36c-3-6-1-12 2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M50 36c3-6 1-12-2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Eyes - confused look (one higher than the other) */}
      <circle cx="38" cy="41" r="1.5" fill="#22d3ee" opacity="0.4" />
      <circle cx="46" cy="43" r="1.5" fill="#22d3ee" opacity="0.4" />
      {/* Confused eyebrow */}
      <path d="M36 38c1-1.5 3-1.5 4 0" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      {/* Nose */}
      <ellipse cx="42" cy="48" rx="3" ry="2" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" fill="none" />
      {/* Ears */}
      <path d="M31 38c-4-2-6 0-5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M53 38c4-2 6 0 5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Question mark above goat */}
      <text x="54" y="24" fill="#a855f7" fillOpacity="0.3" fontSize="12" fontWeight="bold">?</text>
      {/* Sparkles */}
      <circle cx="20" cy="22" r="1.5" fill="#22d3ee" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="98" cy="55" r="1" fill="#a855f7" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="3.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Goat shrugging next to a zero - for "zero results" states
 */
export function GoatZeroResults({ className, width = 120, height = 96 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="goat-zero-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goat-zero-num" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="48" r="45" fill="url(#goat-zero-glow)" />
      {/* Large zero counter */}
      <ellipse cx="78" cy="46" rx="14" ry="18" stroke="url(#goat-zero-num)" strokeWidth="3" fill="none" />
      <line x1="70" y1="34" x2="86" y2="58" stroke="#a855f7" strokeOpacity="0.12" strokeWidth="1.5" strokeLinecap="round" />
      {/* Goat head */}
      <ellipse cx="38" cy="44" rx="10" ry="12" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      {/* Horns */}
      <path d="M30 36c-3-6-1-12 2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M46 36c3-6 1-12-2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Eyes */}
      <circle cx="34" cy="42" r="1.5" fill="#22d3ee" opacity="0.4" />
      <circle cx="42" cy="42" r="1.5" fill="#22d3ee" opacity="0.4" />
      {/* Nose */}
      <ellipse cx="38" cy="49" rx="3" ry="2" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" fill="none" />
      {/* Ears */}
      <path d="M27 38c-4-2-6 0-5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M49 38c4-2 6 0 5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Shrug arms */}
      <path d="M28 56c-6-2-10-6-10-10" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M48 56c6-2 10-6 10-10" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Shrug tilde marks */}
      <path d="M14 43c1-1.5 2.5-1.5 3.5 0s2.5 1.5 3.5 0" stroke="#a855f7" strokeOpacity="0.2" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M55 43c1-1.5 2.5-1.5 3.5 0s2.5 1.5 3.5 0" stroke="#a855f7" strokeOpacity="0.2" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      {/* Sparkles */}
      <circle cx="22" cy="20" r="1.5" fill="#22d3ee" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="65" r="1" fill="#a855f7" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="3.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Confused goat peeking around a broken picture frame - for popup load failures
 * Brand palette: slate-800 body, #22d3ee accents, rose-400 highlights
 */
export function GoatBrokenFrame({ className, width = 120, height = 96 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="goat-frame-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goat-frame-border" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#fb7185" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="48" r="45" fill="url(#goat-frame-glow)" />
      {/* Broken picture frame - top left shard */}
      <path d="M52 22h30v10" stroke="url(#goat-frame-border)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Frame right side */}
      <path d="M82 32v30" stroke="url(#goat-frame-border)" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Frame bottom - broken, offset */}
      <path d="M82 62h-12" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M66 66l-14 0" stroke="#fb7185" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Frame left - cracked */}
      <path d="M52 22v16" stroke="url(#goat-frame-border)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M52 38l-2 4 2 4" stroke="#fb7185" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Crack lines on frame */}
      <path d="M64 22l3 6-2 4" stroke="#fb7185" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Fallen corner shard */}
      <path d="M50 60l-4 8 8-2z" stroke="#fb7185" strokeOpacity="0.2" strokeWidth="1" fill="none" />
      {/* Goat peeking from left side of frame */}
      <ellipse cx="38" cy="42" rx="10" ry="12" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      {/* Horns */}
      <path d="M30 34c-3-6-1-12 2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M46 34c3-6 1-12-2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Eyes - wide/confused */}
      <circle cx="34" cy="39" r="2" stroke="#22d3ee" strokeOpacity="0.3" strokeWidth="1" fill="none" />
      <circle cx="34" cy="39" r="0.8" fill="#22d3ee" opacity="0.5" />
      <circle cx="42" cy="39" r="2" stroke="#22d3ee" strokeOpacity="0.3" strokeWidth="1" fill="none" />
      <circle cx="42" cy="39" r="0.8" fill="#22d3ee" opacity="0.5" />
      {/* Raised eyebrow */}
      <path d="M40 35c1-2 3-2 4-0.5" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      {/* Nose */}
      <ellipse cx="38" cy="46" rx="3" ry="2" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" fill="none" />
      {/* Ears */}
      <path d="M27 36c-4-2-6 0-5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M49 36c4-2 6 0 5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Question mark */}
      <text x="30" y="26" fill="#fb7185" fillOpacity="0.3" fontSize="10" fontWeight="bold">?</text>
      {/* Sparkles */}
      <circle cx="20" cy="20" r="1.5" fill="#fb7185" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="95" cy="50" r="1" fill="#22d3ee" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="88" cy="76" r="1" fill="#a855f7" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="3.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/**
 * Goat holding a disconnected cable - for inspector load errors
 * Brand palette: slate-800 body, #22d3ee accents, rose-400 highlights
 */
export function GoatDisconnected({ className, width = 120, height = 96 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      fill="none"
      width={width}
      height={height}
      className={cn('opacity-80', className)}
    >
      <defs>
        <radialGradient id="goat-disc-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goat-cable-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="goat-cable-right" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#fb7185" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="48" r="45" fill="url(#goat-disc-glow)" />
      {/* Left cable segment (held by goat) */}
      <path d="M48 52c4 2 8 6 10 6" stroke="url(#goat-cable-left)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Cable plug end - left */}
      <rect x="56" y="54" width="6" height="8" rx="1.5" stroke="#22d3ee" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <line x1="59" y1="56" x2="59" y2="58" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" />
      {/* Gap between plugs - disconnection sparks */}
      <line x1="63" y1="57" x2="66" y2="55" stroke="#fb7185" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />
      <line x1="63" y1="59" x2="66" y2="60" stroke="#fb7185" strokeOpacity="0.3" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="64" cy="58" r="1" fill="#fb7185" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Cable plug end - right */}
      <rect x="67" y="54" width="6" height="8" rx="1.5" stroke="#fb7185" strokeOpacity="0.3" strokeWidth="1.5" fill="none" />
      <line x1="70" y1="56" x2="70" y2="58" stroke="#fb7185" strokeOpacity="0.2" strokeWidth="1" />
      {/* Right cable segment (dangling) */}
      <path d="M73 58c4 0 8 4 12 10 4 6 10 8 14 6" stroke="url(#goat-cable-right)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Goat head */}
      <ellipse cx="38" cy="42" rx="10" ry="12" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
      {/* Horns */}
      <path d="M30 34c-3-6-1-12 2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M46 34c3-6 1-12-2-14" stroke="#a855f7" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Eyes - worried look */}
      <circle cx="34" cy="40" r="1.5" fill="#22d3ee" opacity="0.4" />
      <circle cx="42" cy="40" r="1.5" fill="#22d3ee" opacity="0.4" />
      {/* Worried eyebrows */}
      <path d="M32 37c1-1 2.5-1.5 4-0.5" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M40 36.5c1.5-1 3-0.5 4 0.5" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      {/* Nose */}
      <ellipse cx="38" cy="47" rx="3" ry="2" stroke="#22d3ee" strokeOpacity="0.2" strokeWidth="1" fill="none" />
      {/* Mouth - frown */}
      <path d="M35 50c1.5 1.5 4.5 1.5 6 0" stroke="#22d3ee" strokeOpacity="0.12" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      {/* Ears */}
      <path d="M27 36c-4-2-6 0-5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M49 36c4-2 6 0 5 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Hoof holding cable */}
      <path d="M46 50c2 1 3 2 4 3" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Sparkles */}
      <circle cx="18" cy="22" r="1.5" fill="#22d3ee" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="40" r="1" fill="#a855f7" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="3.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="25" cy="75" r="1" fill="#fb7185" opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="3.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function CategorySlotIllustration({ category }: { category?: string }) {
  const cat = (category || '').toLowerCase();

  if (cat.includes('movie') || cat.includes('film') || cat.includes('tv') || cat.includes('anime') || cat.includes('show')) {
    return <SlotFilmReel />;
  }
  if (cat.includes('music') || cat.includes('album') || cat.includes('song') || cat.includes('artist') || cat.includes('band')) {
    return <SlotVinylRecord />;
  }
  if (cat.includes('game') || cat.includes('gaming') || cat.includes('video game')) {
    return <SlotGameController />;
  }
  return <SlotTrophy />;
}
