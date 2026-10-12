import { BustLine } from './BustLine';
import { GoatFigure } from './Goat';
import { BODY, EAR, HORN_FAR, HORN_NEAR } from './goat-paths';
import { Sparkles, scatter, type SparkleSpec } from './Sparkles';

import './brand.css';

/**
 * A decorative layer for each editor mode, painted behind the mode's content.
 * Same goat, four compositions, each answering what the mode is for:
 *   mosaic  the wall: a line-art bust keeping watch over the posters
 *   canvas  the climb: contour ridges with the goat at the summit
 *   spread  the page: an engraved plate in the margin
 *   stage   the show: spotlights, a halo and confetti, with a variant per preset
 */

export type ModeArtKind = 'mosaic' | 'canvas' | 'spread' | 'stage';
export type StagePresetKind = 'podium' | 'rushmore' | 'throne';

export function ModeArt({ mode, preset = 'podium' }: { mode: ModeArtKind; preset?: StagePresetKind }) {
  return (
    <div className={`ma ma-${mode}`} aria-hidden="true">
      {mode === 'mosaic' ? <MosaicArt /> : null}
      {mode === 'canvas' ? <CanvasArt /> : null}
      {mode === 'spread' ? <SpreadArt /> : null}
      {mode === 'stage' ? <StageArt preset={preset} /> : null}
    </div>
  );
}

const MOSAIC_SPARKLES: SparkleSpec[] = [
  { x: 1090, y: 150, size: 7, delay: 0.4, period: 5.4 },
  { x: 910, y: 70, size: 5, delay: 2.1, period: 4.8 },
  { x: 1150, y: 420, size: 5, delay: 3.2, period: 5.9 },
  { x: 760, y: 360, size: 4, delay: 1.2, period: 6.2 },
  { x: 1010, y: 560, size: 4.5, delay: 4, period: 5.2 },
];

function MosaicArt() {
  return (
    <svg viewBox="0 0 1200 800" fill="none" focusable="false">
      <circle cx="930" cy="300" r="300" stroke="#e9c46a" strokeOpacity="0.1" strokeWidth="1" />
      <circle cx="930" cy="300" r="380" stroke="#e9c46a" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="2 12" />
      <BustLine id="ma-mosaic-bust" x={224} y={264} scale={3.2} opacity={0.4} />
      <Sparkles items={MOSAIC_SPARKLES} />
    </svg>
  );
}

function CanvasArt() {
  // Contour ridges: the same mountain, repeated lower and lower, like altitude lines.
  const ridges = Array.from({ length: 7 }, (_, k) => {
    const y0 = 430 + k * 105;
    const lift = 310 - k * 18;
    return {
      d: `M-40 ${y0}C170 ${y0 - 40} 330 ${y0 - lift * 0.7} 500 ${y0 - lift}C670 ${y0 - lift * 0.7} 830 ${y0 - 40} 1040 ${y0}`,
      o: 0.5 - k * 0.06,
    };
  });
  const sparkles: SparkleSpec[] = [
    { x: 560, y: 70, size: 6, delay: 0.5, period: 5 },
    { x: 440, y: 110, size: 4.5, delay: 2.4, period: 5.6 },
    { x: 650, y: 150, size: 4, delay: 3.6, period: 4.8 },
    { x: 200, y: 260, size: 4, delay: 1.4, period: 6.1 },
    { x: 830, y: 300, size: 4.5, delay: 4.2, period: 5.3 },
  ];
  return (
    <svg viewBox="0 0 1000 1000" fill="none" preserveAspectRatio="xMidYMin slice" focusable="false">
      <defs>
        <radialGradient id="ma-canvas-glow" cx="0.5" cy="0.1" r="0.5">
          <stop offset="0" stopColor="#ffe3a1" stopOpacity="0.14" />
          <stop offset="1" stopColor="#ffe3a1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="500" cy="120" r="360" fill="url(#ma-canvas-glow)" />
      {ridges.map((r, i) => (
        <path key={i} d={r.d} stroke={i === 0 ? '#ffe3a1' : '#9aa4ff'} strokeOpacity={Math.max(0.08, r.o * (i === 0 ? 0.7 : 0.35))} strokeWidth={i === 0 ? 1.6 : 1.1} />
      ))}
      <g transform="translate(466 76) scale(0.34)" opacity="0.95">
        <GoatFigure idPrefix="ma-canvas-goat" />
      </g>
      <Sparkles items={sparkles} />
    </svg>
  );
}

function SpreadArt() {
  return (
    <svg viewBox="0 0 420 900" fill="none" preserveAspectRatio="xMidYMin meet" focusable="false">
      <defs>
        <pattern id="ma-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <path d="M0 0V5" stroke="#e9c46a" strokeWidth="0.9" strokeOpacity="0.7" />
        </pattern>
        <clipPath id="ma-plate-clip">
          <rect x="24" y="40" width="372" height="560" />
        </clipPath>
      </defs>

      {/* The plate: a thin border with corner ticks, like a printed engraving */}
      <rect x="24" y="40" width="372" height="560" stroke="#e9c46a" strokeOpacity="0.35" strokeWidth="1" />
      <rect x="32" y="48" width="356" height="544" stroke="#e9c46a" strokeOpacity="0.18" strokeWidth="1" />

      <g clipPath="url(#ma-plate-clip)">
        {/* ground, hatched */}
        <path d="M24 520C120 500 300 500 396 524V600H24Z" fill="url(#ma-hatch)" fillOpacity="0.5" />
        <g transform="translate(34 278) scale(1.2)">
          <path d={HORN_FAR} fill="url(#ma-hatch)" fillOpacity="0.5" stroke="#e9c46a" strokeOpacity="0.35" strokeWidth="0.8" />
          <path d={BODY} fill="url(#ma-hatch)" stroke="#ffe3a1" strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
          <path d={HORN_NEAR} fill="url(#ma-hatch)" stroke="#ffe3a1" strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
          <path d={EAR} fill="url(#ma-hatch)" stroke="#ffe3a1" strokeOpacity="0.8" strokeWidth="1" strokeLinejoin="round" />
        </g>
      </g>

      <g fontFamily="var(--mono)" fill="#e9c46a" fillOpacity="0.55" fontSize="11" letterSpacing="2">
        <text x="24" y="634">FIG. 1</text>
        <text x="24" y="654" fillOpacity="0.4">CAPRA MAXIMA</text>
        <text x="396" y="634" textAnchor="end">PLATE I</text>
      </g>
      <path d="M24 676H396" stroke="#e9c46a" strokeOpacity="0.2" strokeDasharray="1 5" />
    </svg>
  );
}

const CONFETTI = scatter(22, { x: 40, y: -20, w: 1120, h: 300 }, 11).map((p, i) => ({
  x: p.x,
  y: p.y,
  w: 3 + p.t * 4,
  h: 6 + p.u * 8,
  delay: p.t * 12,
  period: 9 + p.u * 8,
  color: ['#ffe3a1', '#e9c46a', '#a9b4ff', '#eceef7'][i % 4],
  rot: Math.round(p.u * 180),
}));

function StageArt({ preset }: { preset: StagePresetKind }) {
  const sparkles: SparkleSpec[] = [
    { x: 600, y: 120, size: 6.5, delay: 0.3, period: 5.2 },
    { x: 360, y: 200, size: 4.5, delay: 2.2, period: 5.8 },
    { x: 860, y: 190, size: 5, delay: 3.4, period: 4.9 },
    { x: 250, y: 420, size: 4, delay: 1.1, period: 6.3 },
    { x: 960, y: 450, size: 4.5, delay: 4.3, period: 5.5 },
  ];
  return (
    <svg viewBox="0 0 1200 700" fill="none" preserveAspectRatio="xMidYMin slice" focusable="false">
      <defs>
        <linearGradient id="ma-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4d4" stopOpacity="0.2" />
          <stop offset="1" stopColor="#fff4d4" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ma-stage-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe3a1" stopOpacity="0.2" />
          <stop offset="1" stopColor="#ffe3a1" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Two spotlights crossing on the middle of the stage */}
      <g className="gb-beam">
        <path d="M250 -20L350 -20L760 640H430Z" fill="url(#ma-beam)" />
        <path d="M850 -20L950 -20L770 640H440Z" fill="url(#ma-beam)" />
      </g>
      <circle cx="600" cy="300" r="300" fill="url(#ma-stage-halo)" className="gb-halo" />
      <circle cx="600" cy="300" r="190" stroke="#e9c46a" strokeOpacity="0.2" strokeWidth="1" />

      {/* The goat never stands behind the covers: it flanks the stage and looks in. */}
      {preset === 'podium' ? (
        <g transform="translate(1170 316) scale(-0.82 0.82)" opacity="0.95">
          <GoatFigure idPrefix="ma-stage-goat" />
        </g>
      ) : null}

      {preset === 'rushmore' ? (
        <g>
          <path d="M0 540L120 460L200 500V700H0Z" fill="#12152a" fillOpacity="0.7" />
          <path d="M1200 540L1090 450L1000 500V700H1200Z" fill="#12152a" fillOpacity="0.7" />
          <BustLine id="ma-rush-l" x={-70} y={330} scale={1.2} opacity={0.55} />
          <BustLine id="ma-rush-r" x={1270} y={330} scale={1.2} opacity={0.55} flip />
        </g>
      ) : null}

      {preset === 'throne' ? (
        <g>
          {/* a crown of rays above the throne */}
          <g stroke="#ffe3a1" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round">
            {Array.from({ length: 15 }, (_, i) => {
              const a = -Math.PI * 0.9 + (i * Math.PI * 0.8) / 14;
              const r1 = 250;
              const r2 = i % 2 ? 300 : 340;
              return (
                <line key={i} x1={600 + Math.cos(a) * r1} y1={260 + Math.sin(a) * r1} x2={600 + Math.cos(a) * r2} y2={260 + Math.sin(a) * r2} />
              );
            })}
          </g>
          <BustLine id="ma-throne" x={1392} y={420} scale={1.6} opacity={0.6} flip />
        </g>
      ) : null}

      {CONFETTI.map((c, i) => (
        <g key={i} transform={`rotate(${c.rot} ${c.x} ${c.y})`}>
          <rect
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            rx="1"
            fill={c.color}
            className="gb-fall"
            style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.period}s` }}
          />
        </g>
      ))}
      <Sparkles items={sparkles} />
    </svg>
  );
}
