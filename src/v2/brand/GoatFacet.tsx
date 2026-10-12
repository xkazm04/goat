/**
 * Variant A, "Crest": a heraldic goat head in profile, cut from gold facets
 * like the `shard` cover motif. The silhouette is one path set; the facets are
 * a deterministic jittered triangle mesh clipped to it, so the same goat is
 * drawn every time and a few facets can catch the light.
 */

const W = 800;
const H = 800;

/** Small deterministic hash to [0, 1). */
function hash(i: number, j: number, salt: number): number {
  let h = (i * 374761393 + j * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

interface Facet {
  points: string;
  opacity: number;
  glint: boolean;
}

function buildMesh(): Facet[] {
  const cols = 11;
  const rows = 12;
  const x0 = 120;
  const y0 = 60;
  const dx = (720 - x0) / cols;
  const dy = (810 - y0) / rows;
  const grid: { x: number; y: number }[][] = [];
  for (let r = 0; r <= rows; r++) {
    const row: { x: number; y: number }[] = [];
    for (let c = 0; c <= cols; c++) {
      const jx = (hash(c, r, 1) - 0.5) * dx * 0.7;
      const jy = (hash(c, r, 2) - 0.5) * dy * 0.7;
      row.push({ x: x0 + c * dx + jx, y: y0 + r * dy + jy });
    }
    grid.push(row);
  }
  const out: Facet[] = [];
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = grid[r][c];
      const b = grid[r][c + 1];
      const d = grid[r + 1][c];
      const e = grid[r + 1][c + 1];
      const flip = hash(c, r, 3) > 0.5;
      const tris = flip
        ? [
            [a, b, d],
            [b, e, d],
          ]
        : [
            [a, b, e],
            [a, e, d],
          ];
      for (const t of tris) {
        const o = 0.07 + hash(n, 7, 4) * 0.5;
        out.push({
          points: t.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
          opacity: Math.round(o * 100) / 100,
          glint: hash(n, 9, 5) > 0.93,
        });
        n += 1;
      }
    }
  }
  return out;
}

const FACETS = buildMesh();

const HEAD =
  'M150 800C190 660 250 540 345 455C380 380 420 300 470 270C520 255 560 290 590 350C615 400 640 450 668 500C678 525 676 548 655 560C635 572 612 574 598 585L586 606C560 630 520 640 490 650C500 700 520 760 540 800Z';
const EAR = 'M405 372C350 372 300 392 262 432C320 437 372 426 412 410Z';
const HORN =
  'M470 285C492 190 448 108 340 85C270 70 200 100 150 170C215 140 280 140 340 160C385 180 408 240 404 342Z';
const BEARD = 'M592 600C602 650 592 700 570 745C558 700 553 660 565 620Z';

export function GoatFacet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="gf-gold" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#ffe3a1" />
          <stop offset="0.45" stopColor="#e9c46a" />
          <stop offset="1" stopColor="#8a5a1c" />
        </linearGradient>
        <linearGradient id="gf-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.7" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id="gf-mask">
          <rect width={W} height={H} fill="url(#gf-fade)" />
        </mask>
        <clipPath id="gf-clip">
          <path d={HEAD} />
          <path d={EAR} />
          <path d={HORN} />
          <path d={BEARD} />
        </clipPath>
      </defs>

      <g mask="url(#gf-mask)">
        <g clipPath="url(#gf-clip)">
          <rect width={W} height={H} fill="url(#gf-gold)" opacity="0.1" />
          {FACETS.map((f, i) => (
            <polygon
              key={i}
              points={f.points}
              fill="url(#gf-gold)"
              fillOpacity={f.opacity}
              stroke="#ffe3a1"
              strokeOpacity="0.16"
              strokeWidth="1"
              className={f.glint ? 'gb-glint' : undefined}
              style={f.glint ? { animationDelay: `${(i % 9) * 0.9}s` } : undefined}
            />
          ))}
        </g>

        {/* Silhouette edge and horn ridges, so the faceted fill reads as a goat. */}
        <g stroke="#ffe3a1" strokeOpacity="0.55" strokeWidth="2" strokeLinejoin="round">
          <path d={HEAD} />
          <path d={EAR} />
          <path d={HORN} />
          <path d={BEARD} />
        </g>
        <g stroke="#ffe3a1" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round">
          <path d="M425 250C430 190 400 130 330 108" />
          <path d="M412 285C418 235 385 170 300 135" />
          <path d="M400 318C405 275 372 210 250 160" />
        </g>

        {/* Eye */}
        <path d="M545 398C558 386 578 388 590 400C576 410 558 412 545 398Z" fill="#06070c" />
        <circle cx="568" cy="399" r="5" fill="#ffe3a1" />
      </g>
    </svg>
  );
}
