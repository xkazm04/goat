import type { ListItem } from '@/v2/list/types';

/**
 * The social card's layout, as plain flex boxes with inline styles (the
 * renderer, Satori, cannot draw every effect). The brand's summit scene is
 * the backdrop, passed in as an SVG data URI; the list's title and top three
 * sit on the left, over its dark side.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

export interface OgCardProps {
  title: string;
  topic: string;
  size: number;
  top: ListItem[];
  /** The summit scene as a `data:image/svg+xml` URI. */
  scene: string;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function OgCard({ title, topic, size, top, scene }: OgCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        color: '#fff',
        background: 'linear-gradient(135deg, #06070c 0%, #0c0e17 60%, #10142b 100%)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={scene}
        width={930}
        height={620}
        alt=""
        style={{ position: 'absolute', right: -30, bottom: 0, width: 930, height: 620 }}
      />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 56, width: 700 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 24, letterSpacing: 4, textTransform: 'uppercase', color: '#f3c969' }}>
            {clip(`G.O.A.T. · Top ${size} · ${topic}`, 52)}
          </div>
          <div style={{ display: 'flex', fontSize: 66, fontWeight: 800, lineHeight: 1.05, marginTop: 16 }}>{clip(title, 64)}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {top.slice(0, 3).map((item, i) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'baseline', gap: 16, fontSize: 34, fontWeight: 700 }}>
              <div style={{ display: 'flex', width: 64, color: '#e9c46a' }}>{`#${i + 1}`}</div>
              <div style={{ display: 'flex' }}>{clip(item.title, 30)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
