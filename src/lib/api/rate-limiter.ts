import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60 seconds
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}

/**
 * Simple in-memory sliding-window rate limiter for API routes.
 *
 * Returns null if the request is allowed, or a 429 NextResponse if rate-limited.
 *
 * @param key - Unique identifier (e.g., IP address or user ID)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): NextResponse | null {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSec) },
      }
    );
  }

  return null;
}

const IP_V4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const IP_V6_RE = /^[0-9a-fA-F:]+$/;

function isValidIp(value: string): boolean {
  return IP_V4_RE.test(value) || IP_V6_RE.test(value);
}

/**
 * Extract a rate-limit key from a request.
 *
 * Trusts platform-verified headers first (x-real-ip set by Vercel's edge
 * network, which cannot be spoofed by clients), then falls back to
 * x-forwarded-for. All values are validated to look like an IP address
 * so arbitrary strings cannot be injected as keys.
 */
export function getRateLimitKey(request: Request, prefix: string): string {
  // x-real-ip is set by Vercel and cannot be spoofed by the client
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp && isValidIp(realIp)) {
    return `${prefix}:${realIp}`;
  }

  // Fallback: first entry in x-forwarded-for (set by reverse proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  const firstForwarded = forwarded?.split(',')[0]?.trim();
  if (firstForwarded && isValidIp(firstForwarded)) {
    return `${prefix}:${firstForwarded}`;
  }

  return `${prefix}:anonymous`;
}
