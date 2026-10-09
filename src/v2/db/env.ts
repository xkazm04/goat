import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * The browser-safe Supabase settings v2 needs. Returns null instead of
 * throwing when they are missing, so /v2 renders an offline shell in a fresh
 * checkout rather than crashing at import time (v1's OG route did the latter).
 */
export function readPublicEnv(source: Record<string, string | undefined>): PublicEnv | null {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return parsed.success ? parsed.data : null;
}

/**
 * Next inlines NEXT_PUBLIC_* only when each name is written out literally,
 * so the object is spelled out here rather than passing process.env through.
 */
export const publicEnv = readPublicEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
