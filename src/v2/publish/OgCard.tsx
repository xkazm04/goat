import type { ListItem } from '@/v2/list/types';

/**
 * The social card's layout, as plain flex boxes with inline styles: the
 * renderer (Satori) cannot draw every cover effect, so this is the OG-safe
 * cover variant from docs/v2/TECHNICAL_PACKAGE.md §2.2, a two-hue gradient
 * with the rank and title.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

export interface OgCardProps {
  title: string;
  topic: string;
  size: number;
  top: ListItem[];
}

const hsl = (h: number, l: number) => `hsl(${h} 70% ${l}%)`;

export function OgCard({ title, topic, size, top }: OgCardProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 56,
        color: '#fff',
        background: 'linear-gradient(135deg, #0b0d1a 0%, #1b1442 60%, #0b2b33 100%)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', color: '#f3c969' }}>
          {`G.O.A.T. · Top ${size} · ${topic}`}
        </div>
        <div style={{ display: 'flex', fontSize: 68, fontWeight: 800, lineHeight: 1.05, marginTop: 14 }}>
          {title.length > 70 ? `${title.slice(0, 69)}…` : title}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 18 }}>
        {top.slice(0, 5).map((item, i) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: 200,
              height: 250,
              padding: 14,
              borderRadius: 18,
              background: `linear-gradient(160deg, ${hsl(item.art.hues[0], 42)}, ${hsl(item.art.hues[1], 24)})`,
              border: '2px solid rgba(255,255,255,0.22)',
            }}
          >
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>{`#${i + 1}`}</div>
            <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, lineHeight: 1.15 }}>
              {item.title.length > 40 ? `${item.title.slice(0, 39)}…` : item.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
