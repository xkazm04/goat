import { memo } from 'react';

/**
 * The sun's rays: fine radial strokes of uneven length, an engraver's sunburst. One SVG with a few hundred
 * bytes of markup, drawn from a fixed pattern so it is identical on the server and the client.
 */
const COUNT = 72;

function rays(): { x1: number; y1: number; x2: number; y2: number; o: number; w: number }[] {
  const out = [];
  for (let i = 0; i < COUNT; i++) {
    const a = (i / COUNT) * Math.PI * 2;
    // a repeating long-short-medium rhythm, so the burst reads as drawn, not generated
    const long = i % 6 === 0 ? 1 : i % 3 === 0 ? 0.72 : i % 2 === 0 ? 0.5 : 0.36;
    const r1 = 0.32;
    const r2 = r1 + 0.18 * long;
    out.push({
      x1: Math.round((Math.cos(a) * r1 + 0.5) * 1000) / 1000,
      y1: Math.round((Math.sin(a) * r1 + 0.5) * 1000) / 1000,
      x2: Math.round((Math.cos(a) * r2 + 0.5) * 1000) / 1000,
      y2: Math.round((Math.sin(a) * r2 + 0.5) * 1000) / 1000,
      o: Math.round((0.25 + 0.5 * long) * 100) / 100,
      w: long > 0.7 ? 1.4 : 0.8,
    });
  }
  return out;
}

const RAYS = rays();

function SunRaysView({ size }: { size: number }) {
  return (
    <svg className="ma-rays" width={size} height={size} viewBox="0 0 1 1" fill="none" focusable="false" aria-hidden="true">
      <circle cx="0.5" cy="0.5" r="0.31" stroke="#e9c46a" strokeOpacity="0.28" strokeWidth="0.0016" />
      <g stroke="#ffe3a1" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        {RAYS.map((r, i) => (
          <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} strokeOpacity={r.o} strokeWidth={r.w} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  );
}

export const SunRays = memo(SunRaysView);
