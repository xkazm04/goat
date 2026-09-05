/**
 * LightTrack emitter tests.
 *
 * The three properties the spec calls out explicitly:
 * 1. Nothing is sent when LIGHTTRACK_URL is unconfigured (opt-in, inert by
 *    default — this project's 8 LLM call sites must stay zero-network-traffic
 *    for anyone who hasn't set the env var).
 * 2. The request body carries the use-case key as `name` (the whole point:
 *    making the declared use cases in .ai/use-cases.json measurable).
 * 3. A failure inside the emitter (network error, bad host, etc.) never
 *    propagates to the caller — fire-and-forget must actually mean that.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emitLightTrackEvent, sanitizeForTelemetry, usageFromGeminiMetadata } from './lighttrack';

const ENV_KEYS = ['LIGHTTRACK_URL', 'LIGHTTRACK_KEY'] as const;
const saved = new Map<string, string | undefined>();

beforeEach(() => {
  for (const k of ENV_KEYS) {
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
});

// Let one microtask turn pass so the fire-and-forget fetch (kicked off via
// `void sendEvent(...)`) has a chance to run before we assert on it.
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('emitLightTrackEvent', () => {
  it('sends no network traffic when LIGHTTRACK_URL is unset', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    emitLightTrackEvent({
      name: 'studio.generate_list_items',
      provider: 'google',
      model: 'gemini-3.1-flash-lite-preview',
      status: 'success',
      latencyMs: 42,
    });

    await flush();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts to {LIGHTTRACK_URL}/v1/events with the use-case key as `name`', async () => {
    process.env.LIGHTTRACK_URL = 'https://lighttrack.example.com';
    process.env.LIGHTTRACK_KEY = 'secret-key';
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    emitLightTrackEvent({
      name: 'match.debate_challenge',
      provider: 'google',
      model: 'gemini-2.0-flash',
      status: 'success',
      usage: { input: 120, output: 45 },
      latencyMs: 733,
    });

    await flush();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const call = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = call;
    expect(url).toBe('https://lighttrack.example.com/v1/events');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer secret-key');

    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      project_id: 'goat',
      provider: 'google',
      model: 'gemini-2.0-flash',
      operation: 'chat',
      status: 'success',
      name: 'match.debate_challenge',
      usage: { input: 120, output: 45 },
    });
    expect(body.error).toBeUndefined();
  });

  it('omits usage entirely rather than sending a zeroed-out block', async () => {
    process.env.LIGHTTRACK_URL = 'https://lighttrack.example.com';
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    emitLightTrackEvent({
      name: 'match.generate_ai_artwork',
      provider: 'openai',
      model: 'dall-e-3',
      status: 'success',
      latencyMs: 5000,
    });

    await flush();

    const body = JSON.parse((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.usage).toBeUndefined();
  });

  it('never sends a cost field', async () => {
    process.env.LIGHTTRACK_URL = 'https://lighttrack.example.com';
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    emitLightTrackEvent({
      name: 'studio.find_youtube_video',
      provider: 'google',
      model: 'gemini-3.1-flash-lite-preview',
      status: 'success',
      usage: { input: 10, output: 5 },
      latencyMs: 100,
    });

    await flush();

    const body = JSON.parse((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).not.toHaveProperty('cost');
  });

  it('does not propagate a fetch failure to the caller (fire-and-forget)', () => {
    process.env.LIGHTTRACK_URL = 'https://lighttrack.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      })
    );

    expect(() =>
      emitLightTrackEvent({
        name: 'studio.find_image_url',
        provider: 'google',
        model: 'gemini-3.1-flash-lite-preview',
        status: 'error',
        latencyMs: 10,
        error: 'boom',
      })
    ).not.toThrow();
  });

  it('does not propagate a synchronously-throwing fetch to the caller either', () => {
    process.env.LIGHTTRACK_URL = 'https://lighttrack.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('synchronous boom');
      })
    );

    expect(() =>
      emitLightTrackEvent({
        name: 'studio.find_image_url',
        provider: 'google',
        model: 'gemini-3.1-flash-lite-preview',
        status: 'success',
        latencyMs: 10,
      })
    ).not.toThrow();
  });

  it('carries the error field only when status is error, and only the sanitized message', async () => {
    process.env.LIGHTTRACK_URL = 'https://lighttrack.example.com';
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    emitLightTrackEvent({
      name: 'match.recommend_item_metadata',
      provider: 'google',
      model: 'gemini-2.0-flash',
      status: 'error',
      latencyMs: 8,
      error: sanitizeForTelemetry('API key not valid: AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
    });

    await flush();

    const body = JSON.parse((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.error).toBe('AI provider authentication error');
    expect(body.error).not.toContain('AIzaSy');
  });
});

describe('sanitizeForTelemetry', () => {
  it('replaces API key / auth errors with a generic message', () => {
    expect(sanitizeForTelemetry('API key not valid: AIzaSy-super-secret')).toBe(
      'AI provider authentication error'
    );
    expect(sanitizeForTelemetry('API_KEY_INVALID')).toBe('AI provider authentication error');
    expect(sanitizeForTelemetry('INVALID_ARGUMENT: bad request')).toBe(
      'AI provider authentication error'
    );
  });

  it('passes through other messages unchanged (short ones)', () => {
    expect(sanitizeForTelemetry('Empty response from Gemini')).toBe('Empty response from Gemini');
  });

  it('falls back to a generic label for empty/undefined messages', () => {
    expect(sanitizeForTelemetry(undefined)).toBe('Unknown error');
    expect(sanitizeForTelemetry('')).toBe('Unknown error');
  });
});

describe('usageFromGeminiMetadata', () => {
  it('maps promptTokenCount/candidatesTokenCount to input/output', () => {
    expect(
      usageFromGeminiMetadata({ promptTokenCount: 100, candidatesTokenCount: 30 })
    ).toEqual({ input: 100, output: 30 });
  });

  it('adds reasoning tokens when thoughtsTokenCount is present and positive', () => {
    expect(
      usageFromGeminiMetadata({
        promptTokenCount: 100,
        candidatesTokenCount: 30,
        thoughtsTokenCount: 512,
      })
    ).toEqual({ input: 100, output: 30, reasoning: 512 });
  });

  it('omits reasoning when thoughtsTokenCount is zero or absent', () => {
    expect(
      usageFromGeminiMetadata({ promptTokenCount: 100, candidatesTokenCount: 30, thoughtsTokenCount: 0 })
    ).toEqual({ input: 100, output: 30 });
  });

  it('returns undefined when there is nothing to report', () => {
    expect(usageFromGeminiMetadata(undefined)).toBeUndefined();
    expect(usageFromGeminiMetadata(null)).toBeUndefined();
    expect(usageFromGeminiMetadata({})).toBeUndefined();
  });
});
