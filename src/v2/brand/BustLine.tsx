import { BODY, EAR, HORN_FAR, HORN_NEAR, HORN_RINGS } from './goat-paths';

/**
 * The goat's head and horns as line art, cropped above the shoulder. Strokes
 * keep their pixel width at any scale, so a huge background bust stays a
 * hairline. `x` and `y` place the drawing's local origin; the head itself
 * spans roughly x 130 to 320 and y -70 to 140 in local units.
 */
export function BustLine({
  id,
  x,
  y,
  scale,
  stroke = '#e9c46a',
  opacity = 1,
  width = 1.2,
  flip = false,
}: {
  /** Unique within the page: names the clip path. */
  id: string;
  x: number;
  y: number;
  scale: number;
  stroke?: string;
  opacity?: number;
  width?: number;
  /** Mirror the bust, so it faces left. `x` is then the drawing's right edge anchor. */
  flip?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} opacity={opacity}>
      <defs>
        <clipPath id={id}>
          <rect x="120" y="-80" width="210" height="230" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`} fill="none" stroke={stroke} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round">
        <path d={HORN_FAR} vectorEffect="non-scaling-stroke" strokeOpacity="0.55" />
        <path d={BODY} vectorEffect="non-scaling-stroke" />
        <path d={HORN_NEAR} vectorEffect="non-scaling-stroke" />
        <path d={EAR} vectorEffect="non-scaling-stroke" />
        {HORN_RINGS.map((d) => (
          <path key={d} d={d} vectorEffect="non-scaling-stroke" strokeOpacity="0.6" />
        ))}
      </g>
    </g>
  );
}
