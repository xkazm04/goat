/**
 * generateDebateChallenge must keep working exactly as before even with the
 * LightTrack emitter wired in. The emitter is fire-and-forget by contract
 * (src/lib/telemetry/lighttrack.ts) — this proves that contract holds at the
 * one real call site added here: a LightTrack endpoint that throws on every
 * request must not change this function's resolved value.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/providers/gemini-client', () => ({
  getGeminiClient: () => ({
    models: {
      generateContent: vi.fn(async () => ({
        text: JSON.stringify({
          argument: 'Solid pick, but the top-tier competition is fierce.',
          challengeStrength: 40,
          controversyScore: 35,
          isHotTake: false,
          keyFacts: ['fact one'],
        }),
        usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 60 },
      })),
    },
  }),
  GEMINI_MODEL_FLASH: 'gemini-2.0-flash',
}));

const baseRequest = {
  itemName: 'Dead Space',
  category: 'Video Games',
  userTier: 'A',
  userPosition: 3,
  listSize: 20,
};

const saved = new Map<string, string | undefined>();

beforeEach(() => {
  for (const k of ['LIGHTTRACK_URL', 'LIGHTTRACK_KEY']) {
    saved.set(k, process.env[k]);
    delete process.env[k];
  }
});

afterEach(() => {
  for (const [k, v] of Array.from(saved.entries())) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  saved.clear();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('generateDebateChallenge + LightTrack emitter', () => {
  it('resolves normally when LightTrack is unconfigured (no network call at all)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { generateDebateChallenge } = await import('./debate-provider');
    const result = await generateDebateChallenge(baseRequest as never);

    expect(result.argument).toContain('Solid pick');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolves normally even when the configured LightTrack endpoint throws on every call', async () => {
    process.env.LIGHTTRACK_URL = 'https://lighttrack.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('LightTrack is down');
      })
    );

    const { generateDebateChallenge } = await import('./debate-provider');
    const result = await generateDebateChallenge(baseRequest as never);

    // The route's actual result is unaffected by the emitter's failure.
    expect(result.argument).toContain('Solid pick');
    expect(result.challengeStrength).toBe(40);
    expect(result.error).toBeUndefined();
  });
});
