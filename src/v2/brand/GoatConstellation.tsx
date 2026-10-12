/**
 * Variant B, "Constellation": the goat as a star chart, a nod to Capricorn.
 * Hand-placed stars along the head, horn and beard joined by hairlines, set in
 * a zodiac ring with tick marks. Stars twinkle on staggered delays.
 */

interface Star {
  x: number;
  y: number;
  r: number;
}

// Head outline, then horn, ear, beard, eye and cheek, as one list so the lines can index into it.
const STARS: Star[] = [
  { x: 345, y: 455, r: 4 }, // 0 nape
  { x: 470, y: 270, r: 6 }, // 1 poll
  { x: 590, y: 350, r: 4 }, // 2 forehead
  { x: 668, y: 500, r: 5 }, // 3 nose
  { x: 655, y: 560, r: 3.5 }, // 4 muzzle
  { x: 598, y: 585, r: 3 }, // 5 mouth
  { x: 570, y: 745, r: 4 }, // 6 beard tip
  { x: 490, y: 650, r: 3.5 }, // 7 jaw
  { x: 440, y: 290, r: 4 }, // 8 horn base
  { x: 440, y: 150, r: 4.5 }, // 9 horn rise
  { x: 340, y: 85, r: 7 }, // 10 horn crown
  { x: 240, y: 95, r: 4 }, // 11 horn sweep
  { x: 150, y: 170, r: 5 }, // 12 horn tip
  { x: 395, y: 345, r: 3.5 }, // 13 ear root
  { x: 215, y: 372, r: 4 }, // 14 ear tip
  { x: 568, y: 399, r: 5.5 }, // 15 eye
  { x: 500, y: 430, r: 3 }, // 16 cheek
  { x: 545, y: 495, r: 3 }, // 17 jaw hinge
  { x: 430, y: 420, r: 2.5 }, // 18 cheek low
  { x: 560, y: 610, r: 2.5 }, // 19 chin
  { x: 235, y: 650, r: 3 }, // 20 neck back
  { x: 320, y: 785, r: 3 }, // 21 shoulder
  { x: 525, y: 785, r: 3 }, // 22 neck front
];

const LINES: number[][] = [
  [0, 1, 2, 3, 4, 5, 7],
  [5, 6, 7],
  [8, 9, 10, 11, 12],
  [1, 8],
  [13, 14],
  [13, 15, 3],
  [15, 16, 17, 7],
  [16, 18, 0],
  [5, 19, 6],
  [0, 20, 21],
  [7, 22],
];

// Faint background stars, fixed so the sky is the same on every render.
const DUST: Star[] = Array.from({ length: 46 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12543.7321;
  const c = Math.sin(i * 39.425) * 9137.1;
  const f = (n: number) => n - Math.floor(n);
  return { x: 40 + f(a) * 720, y: 30 + f(b) * 760, r: 0.8 + f(c) * 1.4 };
});

// A faint body behind the stars, so the lines read as a goat and not as a graph.
const BODY = [
  'M150 800C190 660 250 540 345 455C380 380 420 300 470 270C520 255 560 290 590 350C615 400 640 450 668 500C678 525 676 548 655 560C635 572 612 574 598 585L586 606C560 630 520 640 490 650C500 700 520 760 540 800Z',
  'M470 285C492 190 448 108 340 85C270 70 200 100 150 170C215 140 280 140 340 160C385 180 408 240 404 342Z',
  'M405 372C350 372 300 392 262 432C320 437 372 426 412 410Z',
];

const TICKS = Array.from({ length: 72 }, (_, i) => {
  const angle = (i * 5 * Math.PI) / 180;
  const major = i % 6 === 0;
  const r1 = 372;
  const r2 = major ? 396 : 384;
  return { x1: 400 + Math.cos(angle) * r1, y1: 400 + Math.sin(angle) * r1, x2: 400 + Math.cos(angle) * r2, y2: 400 + Math.sin(angle) * r2 };
});

export function GoatConstellation({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 800 800" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="gc-glow" cx="0.55" cy="0.5" r="0.55">
          <stop offset="0" stopColor="#e9c46a" stopOpacity="0.16" />
          <stop offset="1" stopColor="#e9c46a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="800" height="800" fill="url(#gc-glow)" />

      {/* Zodiac ring */}
      <g stroke="#9198b0" strokeOpacity="0.35" strokeWidth="1">
        <circle cx="400" cy="400" r="372" />
        <circle cx="400" cy="400" r="340" strokeDasharray="2 10" />
        {TICKS.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
        ))}
      </g>

      <g fill="#e9c46a" fillOpacity="0.07" stroke="#e9c46a" strokeOpacity="0.18" strokeWidth="1">
        {BODY.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {DUST.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#eceef7" opacity="0.35" className="gb-twinkle" style={{ animationDelay: `${(i % 11) * 0.7}s` }} />
      ))}

      {/* The figure */}
      <g stroke="#e9c46a" strokeOpacity="0.8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {LINES.map((line, i) => (
          <polyline key={i} points={line.map((n) => `${STARS[n].x},${STARS[n].y}`).join(' ')} pathLength={1} className="gb-draw" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </g>

      {STARS.map((s, i) => (
        <g key={i} className="gb-twinkle" style={{ animationDelay: `${(i % 7) * 0.55}s` }}>
          <circle cx={s.x} cy={s.y} r={s.r * 3.2} fill="#ffe3a1" opacity="0.12" />
          <circle cx={s.x} cy={s.y} r={s.r} fill="#ffe3a1" />
        </g>
      ))}
    </svg>
  );
}
