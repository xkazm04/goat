/** A four-point star, unit size, centred on the origin. */
const STAR = 'M0 -1C0.07 -0.22 0.22 -0.07 1 0C0.22 0.07 0.07 0.22 0 1C-0.07 0.22 -0.22 0.07 -1 0C-0.22 -0.07 -0.07 -0.22 0 -1Z';

export interface SparkleSpec {
  x: number;
  y: number;
  /** Radius in scene units. */
  size: number;
  /** Seconds of delay, so the field never pulses in unison. */
  delay: number;
  /** Seconds per twinkle. */
  period?: number;
}

/** Small star sparkles: each grows, glints and fades on its own clock. */
export function Sparkles({ items, color = '#fff4d4' }: { items: SparkleSpec[]; color?: string }) {
  return (
    <g fill={color} aria-hidden="true">
      {items.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y}) scale(${s.size})`}>
          <path
            d={STAR}
            className="gb-sparkle"
            style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.period ?? 4.5}s` }}
          />
        </g>
      ))}
    </g>
  );
}

export interface MoteSpec {
  x: number;
  y: number;
  r: number;
  delay: number;
  /** Seconds to drift up and fade. */
  period: number;
}

/** Fine dust that rises slowly through the light. */
export function Motes({ items, color = '#ffe3a1' }: { items: MoteSpec[]; color?: string }) {
  return (
    <g fill={color} aria-hidden="true">
      {items.map((m, i) => (
        <circle
          key={i}
          cx={m.x}
          cy={m.y}
          r={m.r}
          className="gb-mote"
          style={{ animationDelay: `${m.delay}s`, animationDuration: `${m.period}s` }}
        />
      ))}
    </g>
  );
}

/** Deterministic spread so the sky is the same on every render and on the server. */
export function scatter(count: number, box: { x: number; y: number; w: number; h: number }, seed = 1): { x: number; y: number; t: number; u: number }[] {
  const out: { x: number; y: number; t: number; u: number }[] = [];
  let s = seed * 9301 + 49297;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < count; i++) {
    out.push({ x: box.x + next() * box.w, y: box.y + next() * box.h, t: next(), u: next() });
  }
  return out;
}
