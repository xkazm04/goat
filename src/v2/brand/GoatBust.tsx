import { BODY, EAR, EYE, HORN_FAR, HORN_NEAR } from './goat-paths';

/**
 * The goat's head and horns in gold on a dark rounded badge, for small sizes:
 * the wordmark, a header, a favicon. It is the same drawing as the figure and
 * the same framing as `src/app/icon.svg`, so the mark is one thing everywhere.
 */
export function GoatBust({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="bust-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4d4" />
          <stop offset="0.55" stopColor="#e9c46a" />
          <stop offset="1" stopColor="#b98a2e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0c0e17" />
      <rect x="1" y="1" width="62" height="62" rx="13" stroke="#e9c46a" strokeOpacity="0.35" strokeWidth="2" />
      <g transform="translate(8 10) scale(0.25) translate(-130 56)">
        <path d={HORN_FAR} fill="#b98a2e" />
        <g fill="url(#bust-gold)">
          <path d={BODY} />
          <path d={HORN_NEAR} />
          <path d={EAR} />
        </g>
        <circle cx={EYE.x} cy={EYE.y} r="4" fill="#0c0e17" />
      </g>
    </svg>
  );
}
