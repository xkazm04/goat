import { notFound } from 'next/navigation';

import { PublishedView } from '@/v2/publish/PublishedView';
import { loadPublished, siteOrigin } from '@/v2/publish/server';

import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadPublished(slug);
  if (!loaded) return { title: 'List not found · G.O.A.T.', robots: { index: false } };

  const { doc, items } = loaded;
  const byId = new Map(items.map((i) => [i.id, i.title]));
  const top = doc.order.slice(0, 3).map((id, i) => `#${i + 1} ${byId.get(id) ?? ''}`.trim());
  const description = top.length > 0 ? `Top ${doc.size} ${doc.topic}: ${top.join(', ')}` : `Top ${doc.size} ${doc.topic}`;
  const origin = siteOrigin();

  return {
    metadataBase: new URL(origin),
    title: `${doc.title} · G.O.A.T.`,
    description,
    robots: loaded.visibility === 'public' ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: 'website', title: doc.title, description, url: `/p/${slug}`, siteName: 'G.O.A.T.' },
    twitter: { card: 'summary_large_image', title: doc.title, description },
    alternates: {
      canonical: `/p/${slug}`,
      types: {
        'application/json+oembed': `${origin}/api/v2/oembed?url=${encodeURIComponent(`${origin}/p/${slug}`)}`,
      },
    },
  };
}

export default async function PublishedPage({ params }: Props) {
  const { slug } = await params;
  const loaded = await loadPublished(slug);
  if (!loaded) notFound();
  return <PublishedView loaded={loaded} />;
}
