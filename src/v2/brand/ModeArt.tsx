import { memo } from 'react';

import { SunRays } from './SunRays';

import './brand.css';
import './plates.css';

/**
 * The art behind each editor mode, from the owner's chosen design (design/winner): an engraved goat, lit
 * from a sun, on a different ground per view. Only drawn art is a bitmap (public/art, baked by
 * tools/bake-art.py, so no visitor pays for the engraver); skies, glows and rays are CSS and SVG.
 *
 *   mosaic  the hang: a sun behind the number-one tile that follows the cover you point at, the goat on a ledge
 *   canvas  the ascent: height is rank, so one engraved range with the goat on its summit
 *   spread  (the plate lives in SpreadPlate)
 *   stage   a proscenium of engraved drapes; the goat watches from the wing, with a variant per preset
 *
 * Nothing here has state: the layers are memoised and the only motion is CSS.
 */

export type ModeArtKind = 'mosaic' | 'canvas' | 'spread' | 'stage';
export type StagePresetKind = 'podium' | 'rushmore' | 'throne';

const ART = '/art';

/** A baked layer. Decoded off the main thread; the size is fixed so nothing shifts when it arrives. */
function Layer({ name, className, width, height }: { name: string; className: string; width: number; height: number }) {
  // Baked, fixed-size art served as-is: next/image would add a loader hop and nothing else.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={`${ART}/${name}.webp`} width={width} height={height} alt="" decoding="async" draggable={false} />;
}

/**
 * Glints: small four-point stars. They are HTML elements, not SVG, so their transform and opacity animate on the
 * compositor; an animated SVG child repaints the whole SVG layer every frame on the main thread, and measured as
 * about a fifth of the cost of a drag. Positions are percentages of the panel.
 */
interface Glint {
  x: number;
  y: number;
  size: number;
  delay: number;
  period: number;
}

const GLINTS: Record<'mosaic' | 'canvas' | 'stage', Glint[]> = {
  mosaic: [
    { x: 81, y: 25, size: 12, delay: 0.4, period: 5.4 },
    { x: 90, y: 55, size: 10, delay: 2.2, period: 4.8 },
    { x: 70, y: 15, size: 9, delay: 3.4, period: 6.1 },
  ],
  canvas: [
    { x: 50, y: 8, size: 12, delay: 0.5, period: 5 },
    { x: 38, y: 16, size: 9, delay: 2.4, period: 5.6 },
    { x: 64, y: 19, size: 8, delay: 3.6, period: 4.8 },
  ],
  stage: [
    { x: 60, y: 20, size: 12, delay: 0.3, period: 5.2 },
    { x: 33, y: 35, size: 9, delay: 2.2, period: 5.8 },
    { x: 90, y: 33, size: 10, delay: 3.4, period: 4.9 },
  ],
};

function Glints({ kind }: { kind: 'mosaic' | 'canvas' | 'stage' }) {
  return (
    <div className="ma-glints">
      {GLINTS[kind].map((g, i) => (
        <i
          key={i}
          style={{ left: `${g.x}%`, top: `${g.y}%`, width: g.size, height: g.size, animationDelay: `${g.delay}s`, animationDuration: `${g.period}s` }}
        />
      ))}
    </div>
  );
}

function MosaicArt() {
  return (
    <>
      <div className="ma-sky ma-sky-mosaic" />
      <div className="ma-stars" />
      <div className="ma-sun" data-sun>
        <div className="ma-sun-spin">
          <SunRays size={1300} />
        </div>
      </div>
      <Layer name="mosaic-ridges" className="ma-ridges" width={1200} height={225} />
      <Layer name="goat-front" className="ma-goat-front" width={422} height={552} />
      <Glints kind="mosaic" />
    </>
  );
}

function CanvasArt() {
  return (
    <>
      <div className="ma-sky ma-sky-canvas" />
      <div className="ma-stars" />
      <div className="ma-sun ma-sun-canvas">
        <div className="ma-sun-spin">
          <SunRays size={1100} />
        </div>
      </div>
      <Layer name="canvas-peak" className="ma-peak" width={1000} height={1400} />
      <Layer name="goat-summit" className="ma-goat-summit" width={187} height={227} />
      <Glints kind="canvas" />
    </>
  );
}

function StageArt({ preset }: { preset: StagePresetKind }) {
  return (
    <>
      <div className="ma-sky ma-sky-stage" />
      <div className="ma-stars" />
      <div className="ma-sun ma-sun-stage">
        <div className="ma-sun-spin">
          <SunRays size={1500} />
        </div>
      </div>
      {preset === 'rushmore' ? <Layer name="stage-rushmore" className="ma-rushmore" width={1200} height={446} /> : null}
      {preset === 'throne' ? (
        <>
          <Layer name="stage-horn" className="ma-horn ma-horn-l" width={175} height={149} />
          <Layer name="stage-horn" className="ma-horn ma-horn-r" width={175} height={149} />
        </>
      ) : null}
      <div className="ma-beams">
        <i />
        <i />
      </div>
      <Layer name="stage-drape" className="ma-drape" width={1000} height={371} />
      {preset === 'podium' ? <Layer name="stage-goat" className="ma-goat-stage" width={295} height={338} /> : null}
      <Glints kind="stage" />
    </>
  );
}

function ModeArtView({ mode, preset = 'podium' }: { mode: ModeArtKind; preset?: StagePresetKind }) {
  if (mode === 'spread') return null;
  return (
    <div className={`ma ma-${mode}`} data-preset={mode === 'stage' ? preset : undefined} aria-hidden="true">
      {mode === 'mosaic' ? <MosaicArt /> : null}
      {mode === 'canvas' ? <CanvasArt /> : null}
      {mode === 'stage' ? <StageArt preset={preset} /> : null}
    </div>
  );
}

export const ModeArt = memo(ModeArtView);
