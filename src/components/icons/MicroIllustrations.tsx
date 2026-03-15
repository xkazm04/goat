/**
 * Micro-Illustrations - Custom SVG icons for filter chips and special UI elements
 *
 * Stroke-based linework (1.5-2px) to blend with Lucide icon system,
 * with filled cyan accent elements for brand personality.
 */

import { type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const defaults = { size: 16, strokeWidth: 1.75, stroke: "currentColor", fill: "none" } as const;

/**
 * Clipboard with checkmark outline - represents "Unranked" items
 */
export function UnrankedIcon({ size = defaults.size, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth={defaults.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Clipboard body */}
      <rect x="3" y="2.5" width="10" height="12" rx="1.5" stroke="currentColor" />
      {/* Clipboard clip */}
      <path d="M6 2.5V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v.5" stroke="currentColor" />
      {/* Checkmark with cyan accent */}
      <path d="M5.5 8.5l2 2 3.5-4" stroke="#22d3ee" strokeWidth={2} />
    </svg>
  );
}

/**
 * Grid slot with glow dot - represents "In Grid" items
 */
export function InGridIcon({ size = defaults.size, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth={defaults.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Grid cells */}
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" />
      {/* Cyan glow dot in center */}
      <circle cx="8" cy="8" r="2" fill="#22d3ee" opacity="0.8" />
      <circle cx="8" cy="8" r="3.5" stroke="#22d3ee" strokeWidth="0.75" opacity="0.3" />
    </svg>
  );
}

/**
 * Crown with radiating lines - represents "Top Rated" items
 */
export function TopRatedIcon({ size = defaults.size, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth={defaults.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Crown shape */}
      <path
        d="M2.5 11.5l1-6 3 3 1.5-4 1.5 4 3-3 1 6z"
        stroke="currentColor"
        fill="#22d3ee"
        fillOpacity="0.15"
      />
      {/* Crown base */}
      <path d="M2.5 11.5h11" stroke="currentColor" />
      {/* Radiating accent lines */}
      <line x1="8" y1="1" x2="8" y2="2.5" stroke="#22d3ee" strokeWidth="1.5" />
      <line x1="4" y1="2" x2="5" y2="3.2" stroke="#22d3ee" strokeWidth="1" opacity="0.6" />
      <line x1="12" y1="2" x2="11" y2="3.2" stroke="#22d3ee" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/**
 * Clock face with sparkle accent - represents "Recent" items
 */
export function RecentIcon({ size = defaults.size, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth={defaults.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Clock circle */}
      <circle cx="7.5" cy="8.5" r="5.5" stroke="currentColor" />
      {/* Clock hands */}
      <path d="M7.5 5v3.5l2.5 1.5" stroke="currentColor" />
      {/* Sparkle accent */}
      <path
        d="M13 2l.5 1.5L15 4l-1.5.5L13 6l-.5-1.5L11 4l1.5-.5z"
        fill="#22d3ee"
        stroke="#22d3ee"
        strokeWidth="0.5"
      />
    </svg>
  );
}

/**
 * Hidden gem crystal - for SpotlightTooltip easter egg discovery
 */
export function HiddenGemIcon({ size = defaults.size, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth={defaults.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Crystal top facets */}
      <path d="M4 6l4-4.5L12 6" stroke="#22d3ee" />
      <path d="M4 6h8" stroke="#22d3ee" />
      {/* Crystal body */}
      <path
        d="M4 6l4 8.5L12 6"
        stroke="#22d3ee"
        fill="#22d3ee"
        fillOpacity="0.15"
      />
      {/* Inner facet line */}
      <path d="M6 6l2 8.5L10 6" stroke="#22d3ee" opacity="0.4" strokeWidth="1" />
      {/* Sparkle accents */}
      <circle cx="2" cy="4" r="0.6" fill="#22d3ee" opacity="0.6" />
      <circle cx="14" cy="3" r="0.4" fill="#22d3ee" opacity="0.4" />
      <circle cx="1.5" cy="8" r="0.3" fill="#22d3ee" opacity="0.3" />
    </svg>
  );
}
