import { GoatFigure } from './Goat';
import { Motes, scatter, Sparkles, type MoteSpec, type SparkleSpec } from './Sparkles';

/**
 * The summit: the goat on the number-one step, under a soft halo, with small
 * sparkles and rising dust. It is the landing page's baseline art; the parts
 * (`GoatFigure`, `Sparkles`, `Motes`) are exported separately so other pages
 * can use a piece of it.
 *
 * Scene space is 1200 by 800. Light is deliberately quiet: a low halo, a thin
 * rim on the goat, and a handful of small glints instead of a bright sun.
 */

const GOAT_AT = { x: 654, y: 310 };
const HALO = { x: 820, y: 360 };

const SKY = scatter(34, { x: 30, y: 20, w: 1140, h: 380 }, 3).map((p) => ({ x: p.x, y: p.y, r: 0.6 + p.t * 1.0, o: 0.25 + p.u * 0.35 }));

const SPARKLES: SparkleSpec[] = [
  // on the goat: horn tips, nose, back
  { x: 796, y: 306, size: 8, delay: 0.2, period: 5 },
  { x: 846, y: 292, size: 5.5, delay: 1.9, period: 4.6 },
  { x: 952, y: 388, size: 6.5, delay: 3.1, period: 5.4 },
  { x: 862, y: 402, size: 4.5, delay: 4.2, period: 4.2 },
  // along the step
  { x: 682, y: 558, size: 7, delay: 0.9, period: 5.2 },
  { x: 958, y: 558, size: 7, delay: 2.7, period: 4.8 },
  { x: 835, y: 640, size: 4.5, delay: 3.6, period: 4.4 },
  // around the halo
  { x: 636, y: 252, size: 5.5, delay: 1.3, period: 5.8 },
  { x: 1012, y: 228, size: 4.5, delay: 2.4, period: 5.1 },
  { x: 1048, y: 478, size: 5, delay: 0.6, period: 6 },
  { x: 560, y: 410, size: 4, delay: 3.3, period: 4.9 },
  // far sky
  { x: 330, y: 120, size: 4, delay: 2.2, period: 6.2 },
  { x: 1120, y: 120, size: 4.5, delay: 4.1, period: 5.6 },
  { x: 470, y: 60, size: 3.5, delay: 0.4, period: 6.6 },
];

const MOTES: MoteSpec[] = scatter(24, { x: 560, y: 330, w: 560, h: 380 }, 7).map((p) => ({
  x: p.x,
  y: p.y,
  r: 0.9 + p.t * 1.3,
  delay: p.u * 14,
  period: 10 + p.t * 8,
}));

export function SummitScene({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 800" fill="none" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="gs-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe3a1" stopOpacity="0.2" />
          <stop offset="0.45" stopColor="#e9c46a" stopOpacity="0.09" />
          <stop offset="1" stopColor="#e9c46a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gs-ridge-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#232748" />
          <stop offset="1" stopColor="#0c0e17" />
        </linearGradient>
        <linearGradient id="gs-ridge-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#171a33" />
          <stop offset="1" stopColor="#090a12" />
        </linearGradient>
        <linearGradient id="gs-step" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#292d4b" />
          <stop offset="1" stopColor="#0d0f1c" />
        </linearGradient>
        <linearGradient id="gs-step-top" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffe3a1" stopOpacity="0.25" />
          <stop offset="0.5" stopColor="#ffe3a1" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffe3a1" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="gs-gold-text" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3a1" />
          <stop offset="1" stopColor="#b98a2e" />
        </linearGradient>
        <linearGradient id="gs-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff4d4" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff4d4" stopOpacity="1" />
          <stop offset="1" stopColor="#fff4d4" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="gs-pool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe3a1" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ffe3a1" stopOpacity="0" />
        </radialGradient>
        <filter id="gs-mist-blur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>

      {/* Sky */}
      <g fill="#eceef7">
        {SKY.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
        ))}
      </g>

      {/* Halo: a quiet disc of light, a thin ring, and a slow orbit with three small beads */}
      <g className="gb-halo">
        <circle cx={HALO.x} cy={HALO.y} r="340" fill="url(#gs-halo)" />
        <circle cx={HALO.x} cy={HALO.y} r="196" stroke="#e9c46a" strokeOpacity="0.28" strokeWidth="1.2" />
      </g>
      <g className="gb-orbit">
        <circle cx={HALO.x} cy={HALO.y} r="258" stroke="#e9c46a" strokeOpacity="0.14" strokeWidth="1" strokeDasharray="2 10" />
        <circle cx={HALO.x + 258} cy={HALO.y} r="2.4" fill="#ffe3a1" opacity="0.8" />
        <circle cx={HALO.x - 129} cy={HALO.y - 223} r="1.8" fill="#ffe3a1" opacity="0.6" />
        <circle cx={HALO.x - 129} cy={HALO.y + 223} r="1.8" fill="#ffe3a1" opacity="0.6" />
      </g>

      {/* Ridges, far to near, with a faint lit edge on the far one */}
      <path d="M0 640L150 520L260 590L420 450L560 560L700 480L860 580L1010 500L1200 600V800H0Z" fill="url(#gs-ridge-far)" />
      <path d="M150 520L260 590L420 450L560 560L700 480L860 580L1010 500L1200 600" stroke="#9aa4ff" strokeOpacity="0.16" strokeWidth="1.2" />
      <g className="gb-mist" filter="url(#gs-mist-blur)">
        <ellipse cx="420" cy="590" rx="300" ry="26" fill="#9aa4ff" opacity="0.1" />
        <ellipse cx="980" cy="640" rx="260" ry="22" fill="#9aa4ff" opacity="0.08" />
      </g>
      <path d="M0 700L180 600L320 660L520 540L680 640L820 570L1000 650L1200 580V800H0Z" fill="url(#gs-ridge-near)" />

      {/* Podium: 2, 1, 3 */}
      <path d="M470 640H680V800H470Z" fill="url(#gs-step)" stroke="#ffe3a1" strokeOpacity="0.14" />
      <path d="M680 560H960V800H680Z" fill="url(#gs-step)" stroke="#ffe3a1" strokeOpacity="0.28" />
      <path d="M960 690H1150V800H960Z" fill="url(#gs-step)" stroke="#ffe3a1" strokeOpacity="0.14" />
      <ellipse cx="820" cy="566" rx="210" ry="44" fill="url(#gs-pool)" />
      <path d="M470 640H680" stroke="#ffe3a1" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M960 690H1150" stroke="#ffe3a1" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M680 560H960" stroke="url(#gs-step-top)" strokeWidth="3" />
      <path d="M680 560H960" pathLength={1} stroke="url(#gs-sheen)" strokeWidth="3.5" strokeLinecap="round" className="gb-sheen" />

      <g fontFamily="var(--display)" fontWeight="900" textAnchor="middle">
        <text x="820" y="700" fontSize="116" fill="url(#gs-gold-text)" fillOpacity="0.92">
          1
        </text>
        <text x="575" y="745" fontSize="70" fill="#9198b0" fillOpacity="0.55">
          2
        </text>
        <text x="1055" y="770" fontSize="58" fill="#9198b0" fillOpacity="0.5">
          3
        </text>
      </g>

      {/* The goat, hooves on the step */}
      <g transform={`translate(${GOAT_AT.x} ${GOAT_AT.y})`}>
        <GoatFigure idPrefix="summit-goat" />
      </g>

      <Motes items={MOTES} />
      <Sparkles items={SPARKLES} />
    </svg>
  );
}
