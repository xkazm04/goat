/**
 * LightTrack telemetry emitter
 *
 * Opt-in usage/latency reporting for the LLM call sites declared in
 * `.ai/use-cases.json`. Every call site in this project already logs a
 * structured `console.log` line and stops there — no token usage, no
 * finishReason, no cost, no sink. This module adds a side-channel emitter
 * that call sites invoke *in addition to* their existing logging (which is
 * never removed or changed).
 *
 * Contract: POST {LIGHTTRACK_URL}/v1/events with
 * `authorization: Bearer {LIGHTTRACK_KEY}` and a JSON body describing the
 * call (project_id, provider, model, operation, status, name, usage,
 * latency_ms, error).
 *
 * Hard rules, enforced here so every call site gets them for free:
 * - Opt-in and inert by default: no `LIGHTTRACK_URL` means this module never
 *   touches the network.
 * - Fire-and-forget: this function never throws, never returns a promise the
 *   caller needs to await, and never delays a response. A short timeout
 *   guards against a hanging LightTrack endpoint.
 * - No invented cost: this project has no price book, so `cost` is never
 *   sent. Omit `usage` entirely when a call path has no token counts to
 *   report (e.g. image generation providers).
 * - The `error` field must never carry a raw provider error that could
 *   contain a key or other sensitive detail — `sanitizeForTelemetry` applies
 *   the same auth-error detection already used to sanitize client-facing
 *   errors in `studio-utils.ts`.
 */

const LIGHTTRACK_TIMEOUT_MS = 3000;

export type LightTrackProvider = 'google' | 'openai' | 'replicate';
export type LightTrackStatus = 'success' | 'error';

export interface LightTrackUsage {
  input: number;
  output: number;
  /**
   * Reasoning/"thoughts" tokens (Gemini's `thoughtsTokenCount`). Not part of
   * the minimal contract shape but additive — LightTrack ignores fields it
   * doesn't recognize, and this is the single most commonly discarded cost
   * signal on reasoning models, so it rides along whenever the provider
   * reports it.
   */
  reasoning?: number;
}

export interface LightTrackEventInput {
  /** The use-case key from .ai/use-cases.json, e.g. "studio.generate_list_items" */
  name: string;
  provider: LightTrackProvider;
  /** The model that actually ran. */
  model: string;
  status: LightTrackStatus;
  /** Omit entirely when the call path genuinely does not report counts. */
  usage?: LightTrackUsage;
  latencyMs: number;
  /** Sanitized message only — required when status is 'error'. */
  error?: string;
}

/**
 * Emit one LightTrack event. Fire-and-forget: never throws, never blocks.
 *
 * No-op (zero network traffic) unless `LIGHTTRACK_URL` is set.
 */
export function emitLightTrackEvent(input: LightTrackEventInput): void {
  let url: string | undefined;
  try {
    url = process.env.LIGHTTRACK_URL?.trim();
  } catch {
    return;
  }
  if (!url) return;

  const key = process.env.LIGHTTRACK_KEY?.trim();

  const body: Record<string, unknown> = {
    project_id: 'goat',
    provider: input.provider,
    model: input.model,
    operation: 'chat',
    status: input.status,
    name: input.name,
    latency_ms: Math.max(0, Math.round(input.latencyMs)),
  };
  if (input.usage) {
    body.usage = input.usage;
  }
  if (input.status === 'error' && input.error) {
    body.error = input.error;
  }

  // Never await, never let a rejection escape this call.
  void sendEvent(url, key, body);
}

async function sendEvent(url: string, key: string | undefined, body: Record<string, unknown>): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LIGHTTRACK_TIMEOUT_MS);
    try {
      const endpoint = `${url.replace(/\/+$/, '')}/v1/events`;
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Swallow everything: network errors, timeouts, JSON errors. Telemetry
    // must never surface into a caller's error path.
  }
}

/**
 * Same auth-error detection `studio-utils.ts#handleStudioError` already uses
 * to sanitize client-facing errors, reused here so the emitter's `error`
 * field never carries a raw provider message that might embed a key.
 */
export function sanitizeForTelemetry(message: string | undefined | null): string {
  const msg = message || 'Unknown error';
  if (msg.includes('API key') || msg.includes('API_KEY_INVALID') || msg.includes('INVALID_ARGUMENT')) {
    return 'AI provider authentication error';
  }
  // Cap length defensively — telemetry is a side channel, not a log dump.
  return msg.slice(0, 500);
}

/**
 * Shape of Gemini's `usageMetadata`, shared by both the `@google/genai` SDK
 * response and the raw REST response (same field names either way).
 */
export interface GeminiUsageMetadataLike {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
}

/**
 * Build a LightTrack usage object from Gemini's `usageMetadata`. Returns
 * undefined when there is nothing to report, so callers can spread it away
 * cleanly rather than sending a zeroed-out usage block.
 */
export function usageFromGeminiMetadata(
  usageMetadata: GeminiUsageMetadataLike | null | undefined
): LightTrackUsage | undefined {
  if (!usageMetadata) return undefined;
  const { promptTokenCount, candidatesTokenCount, thoughtsTokenCount } = usageMetadata;
  if (promptTokenCount === undefined && candidatesTokenCount === undefined) {
    return undefined;
  }
  const usage: LightTrackUsage = {
    input: promptTokenCount ?? 0,
    output: candidatesTokenCount ?? 0,
  };
  if (typeof thoughtsTokenCount === 'number' && thoughtsTokenCount > 0) {
    usage.reasoning = thoughtsTokenCount;
  }
  return usage;
}
