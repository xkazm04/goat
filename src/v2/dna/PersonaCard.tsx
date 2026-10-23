import { Vignette } from '@/v2/brand/Vignette';

import { radarPoints, type Dna } from './dna';

export interface PersonaCardProps {
  persona: { name: string; tagline: string; evidence: string[] };
  dna: Dna;
  cardNo: number;
}

const RADAR_SIZE = 180;
const RADAR_SPOKES = 6;

/** The profile's centrepiece (study E4): persona, a radar of the top traits, a holographic sheen and a card number. */
export function PersonaCard({ persona, dna, cardNo }: PersonaCardProps) {
  const top = dna.traits.slice(0, RADAR_SPOKES);
  const radius = RADAR_SIZE / 2 - 28;
  const points = radarPoints(top.map((t) => t.weight), radius);
  const rim = radarPoints(top.map(() => 1), radius);
  const label = radarPoints(top.map(() => 1), radius + 16);
  const center = RADAR_SIZE / 2;

  return (
    <article className="pc" aria-label={`Persona card ${cardNo}: ${persona.name}`}>
      <span className="pc-sheen" aria-hidden="true" />
      <Vignette className="pc-vignette" label={String(cardNo).padStart(3, '0')} />
      <header>
        <span className="v2-eyebrow">Taste card</span>
        <span className="v2-sr">No. {String(cardNo).padStart(3, '0')}</span>
      </header>
      <h2>{persona.name}</h2>
      <p className="pc-tag">{persona.tagline}</p>

      <svg viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} role="img" aria-label={`Top traits: ${top.map((t) => t.name).join(', ')}`}>
        <g transform={`translate(${center} ${center})`}>
          <polygon className="pc-rim" points={rim.map((p) => `${p.x},${p.y}`).join(' ')} />
          {rim.map((p, i) => (
            <line key={top[i].name} className="pc-spoke" x1={0} y1={0} x2={p.x} y2={p.y} />
          ))}
          <polygon className="pc-shape" points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
          {label.map((p, i) => (
            <text key={top[i].name} className="pc-label" x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle">
              {top[i].name}
            </text>
          ))}
        </g>
      </svg>

      <ul className="pc-evidence">
        {persona.evidence.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {dna.era ? (
        <div className="pc-era" role="img" aria-label={`Average year ${dna.era.meanYear}`}>
          <span>Classic</span>
          <span className="pc-bar">
            <i style={{ left: `${Math.round(dna.era.position * 100)}%` }} />
          </span>
          <span>Modern</span>
        </div>
      ) : null}
    </article>
  );
}
