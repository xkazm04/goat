import { ImageResponse } from 'next/og';

import { SUMMIT_STILL_SVG } from '@/v2/brand/summit-still';
import { OG_SIZE, OgCard } from '@/v2/publish/OgCard';
import { loadPublished } from '@/v2/publish/server';

export const runtime = 'nodejs';
export const alt = 'A G.O.A.T. ranking';
export const size = OG_SIZE;
export const contentType = 'image/png';

const SCENE = `data:image/svg+xml;base64,${Buffer.from(SUMMIT_STILL_SVG).toString('base64')}`;

/**
 * The social card, drawn on the Node runtime with the anon key: v1 drew it on
 * Edge with the service-role key and threw at module load when env was missing.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loaded = await loadPublished(slug);

  if (!loaded) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b0d1a',
            color: '#fff',
            fontSize: 64,
          }}
        >
          G.O.A.T.
        </div>
      ),
      size,
    );
  }

  const byId = new Map(loaded.items.map((i) => [i.id, i]));
  const top = loaded.doc.order.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  return new ImageResponse(
    <OgCard title={loaded.doc.title} topic={loaded.doc.topic} size={loaded.doc.size} top={top} scene={SCENE} />,
    size,
  );
}
