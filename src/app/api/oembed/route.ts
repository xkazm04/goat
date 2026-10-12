import { buildOEmbed, slugFromUrl } from '@/v2/publish/oembed';
import { loadPublished, siteOrigin } from '@/v2/publish/server';

export const runtime = 'nodejs';

/** oEmbed 1.0 provider. Only published lists answer; anything else is a 404, as the spec asks. */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const origin = siteOrigin();
  const format = params.get('format');
  if (format && format !== 'json') return new Response('Only json is supported.', { status: 501 });

  const slug = slugFromUrl(params.get('url') ?? '', origin);
  const loaded = slug ? await loadPublished(slug) : null;
  if (!slug || !loaded) return new Response('Not found.', { status: 404 });

  const body = buildOEmbed({
    origin,
    slug,
    title: loaded.doc.title,
    maxWidth: params.get('maxwidth'),
    maxHeight: params.get('maxheight'),
  });
  return Response.json(body, { headers: { 'cache-control': 'public, max-age=300' } });
}
