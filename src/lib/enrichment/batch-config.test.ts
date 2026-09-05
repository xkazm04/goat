import { afterEach, describe, expect, it, vi } from 'vitest';

import { EnrichmentPipelineClass } from './EnrichmentPipeline';

/**
 * enrichBatch takes per-request config overrides. It used to apply them by
 * assigning onto the pipeline singleton and restoring the old value when the
 * batch finished -- across every `await` in between. Two batches, or a batch
 * and a plain enrich, in flight at once therefore read each other's settings,
 * and the second restore put back the FIRST batch's overrides as if they were
 * the defaults.
 */
describe('EnrichmentPipeline.enrichBatch config isolation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not publish its overrides on the singleton while it runs', async () => {
    const observed: number[] = [];
    const pipeline = new EnrichmentPipelineClass();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        // Observed from inside the batch, mid-flight.
        observed.push(pipeline.getConfig().minConfidence);
        const body = String(url).includes('list=search')
          ? { query: { search: [{ pageid: 1, title: 'Subject', snippet: 's' }] } }
          : { query: { pages: { '1': { pageid: 1, title: 'Subject', extract: 'text' } } } };
        return { ok: true, status: 200, statusText: 'OK', json: async () => body } as unknown as Response;
      })
    );

    await pipeline.enrichBatch({
      items: [{ name: 'Subject', category: 'general' }],
      config: { minConfidence: 0.99 },
    });

    expect(observed.length).toBeGreaterThan(0);
    expect(observed.every((v) => v === 0.6)).toBe(true);
    expect(pipeline.getConfig().minConfidence).toBe(0.6);
  });

  it('still applies its overrides to the items it enriches', async () => {
    const pipeline = new EnrichmentPipelineClass();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const body = String(url).includes('list=search')
          ? { query: { search: [{ pageid: 1, title: 'Subject', snippet: 's' }] } }
          : { query: { pages: { '1': { pageid: 1, title: 'Subject', extract: 'text' } } } };
        return { ok: true, status: 200, statusText: 'OK', json: async () => body } as unknown as Response;
      })
    );

    const lenient = await pipeline.enrichBatch({
      items: [{ name: 'Subject', category: 'general' }],
    });
    const strict = await pipeline.enrichBatch({
      items: [{ name: 'Subject', category: 'general' }],
      config: { minConfidence: 1.01 },
    });

    expect(lenient.successful).toBe(1);
    expect(strict.successful).toBe(0);
  });
});
