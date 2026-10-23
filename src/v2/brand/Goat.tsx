import { BODY, EAR, EYE, FAR_LEGS, GOAT_SIZE, HORN_FAR, HORN_NEAR, HORN_RIM, HORN_RINGS, RIM, TAIL } from './goat-paths';

/**
 * The goat as an SVG group in its 300 by 260 local space, for placing inside
 * any scene. `rim` adds the thin upper-edge light; `idPrefix` keeps gradient
 * ids unique when more than one goat is on a page.
 */
export function GoatFigure({ rim = true, idPrefix = 'goat' }: { rim?: boolean; idPrefix?: string }) {
  const rimId = `${idPrefix}-rim`;
  return (
    <g>
      <defs>
        <linearGradient id={rimId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e9c46a" stopOpacity="0.15" />
          <stop offset="0.55" stopColor="#ffe3a1" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff4d4" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* far side, darker, drawn first */}
      <path d={HORN_FAR} fill="#0a0c16" />
      <path d={FAR_LEGS} fill="#0a0c16" />

      {/* near side */}
      <g fill="#06070c">
        <path d={TAIL} />
        <path d={BODY} />
        <path d={HORN_NEAR} />
        <path d={EAR} />
      </g>

      {/* growth rings on the horn */}
      <g stroke="#2a2f55" strokeWidth="1.2" strokeLinecap="round">
        {HORN_RINGS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {rim ? (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={RIM} stroke={`url(#${rimId})`} strokeWidth="1.6" />
          <path d={HORN_RIM} stroke={`url(#${rimId})`} strokeWidth="1.3" strokeOpacity="0.8" />
        </g>
      ) : null}

      <circle cx={EYE.x} cy={EYE.y} r="1.9" fill="#ffe3a1" />
    </g>
  );
}

/** The goat alone, as a small self-contained mark (a logo or an empty-state accent). */
export function GoatMark({ className, size = 160, rim = true }: { className?: string; size?: number; rim?: boolean }) {
  const { width, height } = GOAT_SIZE;
  return (
    <svg
      className={className}
      width={size}
      height={(size * (height + 40)) / width}
      viewBox={`0 -40 ${width} ${height + 40}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <GoatFigure rim={rim} idPrefix="goat-mark" />
    </svg>
  );
}
