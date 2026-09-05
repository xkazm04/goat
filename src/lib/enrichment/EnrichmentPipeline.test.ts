import { afterEach, describe, expect, it, vi } from 'vitest';

import { EnrichmentPipelineClass } from './EnrichmentPipeline';

/**
 * Serve the two Wikipedia calls one enrichment makes (search, then summary).
 * Wikipedia needs no credentials, so it is the one source available in a test
 * process with no API keys.
 */
function stubWikipedia(title: string) {
  const fetchStub = vi.fn(async (url: string) => {
    const body = String(url).includes('list=search')
      ? { query: { search: [{ pageid: 42, title, snippet: 'a snippet' }] } }
      : {
          query: {
            pages: {
              '42': {
                pageid: 42,
                title,
                extract: 'An encyclopedia extract.',
                thumbnail: { source: 'https://example.test/i.jpg', width: 500, height: 700 },
              },
            },
          },
        };
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => body,
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

describe('EnrichmentPipeline', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('leaves no pending timer behind once a source has answered', async () => {
    // fetchFromSource raced every fetch against a `setTimeout` it never
    // cleared, so each source left a live timer for the whole
    // sourceTimeoutMs (10s by default) after its work was done. A batch of 50
    // items over 3 sources parked 150 of them, holding the event loop open --
    // the shape that keeps a serverless invocation from freezing on time.
    vi.useFakeTimers();
    stubWikipedia('Test Subject');

    const pipeline = new EnrichmentPipelineClass();
    const result = await pipeline.enrich({ name: 'Test Subject', category: 'general' });

    expect(result.success).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('still times a source out when it never answers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    );

    const pipeline = new EnrichmentPipelineClass({ sourceTimeoutMs: 1000 });
    const pending = pipeline.enrich({ name: 'Test Subject', category: 'general' });
    await vi.advanceTimersByTimeAsync(1500);
    const result = await pending;

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.error.includes('Timeout'))).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
