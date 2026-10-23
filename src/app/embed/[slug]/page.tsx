import { notFound } from 'next/navigation';

import { embedMode, EmbedList } from '@/v2/publish/EmbedList';
import { loadPublished, siteOrigin } from '@/v2/publish/server';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EmbedPage({ params, searchParams }: Props) {
  const [{ slug }, { mode }] = await Promise.all([params, searchParams]);
  const loaded = await loadPublished(slug);
  if (!loaded) notFound();

  return (
    <EmbedList
      doc={loaded.doc}
      items={Object.fromEntries(loaded.items.map((i) => [i.id, i]))}
      mode={embedMode(mode)}
      href={`${siteOrigin()}/p/${slug}`}
    />
  );
}
