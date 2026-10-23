import { GoatFigure } from './Goat';
import { Sparkles, type SparkleSpec } from './Sparkles';

const SPARKLES: SparkleSpec[] = [
  { x: 168, y: 36, size: 6, delay: 0.3, period: 5 },
  { x: 255, y: 86, size: 5, delay: 1.7, period: 4.6 },
  { x: 62, y: 120, size: 4.5, delay: 2.6, period: 5.4 },
  { x: 300, y: 212, size: 5, delay: 3.5, period: 4.8 },
  { x: 40, y: 232, size: 4, delay: 0.9, period: 5.6 },
];

/**
 * A small self-contained scene: the goat on one step with a quiet halo and a
 * few glints. The step carries a label, so the same art can mean a card number,
 * a rank, or "not yet" ("?"). Used for empty states and the persona card.
 */
export function Vignette({ label, className, sparkles = true }: { label: string; className?: string; sparkles?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 360 310" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="vg-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe3a1" stopOpacity="0.18" />
          <stop offset="1" stopColor="#e9c46a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vg-step" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2f4d" />
          <stop offset="1" stopColor="#10121f" />
        </linearGradient>
        <linearGradient id="vg-label" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3a1" />
          <stop offset="1" stopColor="#b98a2e" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="140" r="140" fill="url(#vg-halo)" />
      <circle cx="180" cy="140" r="96" stroke="#e9c46a" strokeOpacity="0.22" strokeWidth="1" />
      <path d="M52 244H308V310H52Z" fill="url(#vg-step)" stroke="#ffe3a1" strokeOpacity="0.25" />
      <path d="M52 244H308" stroke="#ffe3a1" strokeOpacity="0.7" strokeWidth="2" />
      <text x="180" y="296" textAnchor="middle" fontFamily="var(--display)" fontWeight="900" fontSize="46" fill="url(#vg-label)">
        {label}
      </text>
      <g transform="translate(64 51) scale(0.78)">
        <GoatFigure idPrefix="vignette-goat" />
      </g>
      {sparkles ? <Sparkles items={SPARKLES} /> : null}
    </svg>
  );
}
