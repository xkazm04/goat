import { createClient } from '@supabase/supabase-js';

import { isOverQuota, quotaWindowStart, type AiTask } from './quota';

/**
 * Server-only Supabase access for AI quotas. The service-role key never
 * leaves this module and is never read by client code (TECHNICAL_PACKAGE §9, #5).
 * Returns null when it is not configured, so the route can fall back to the
 * fixture provider in a fresh checkout.
 */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { db: { schema: 'goat_v2' }, auth: { persistSession: false, autoRefreshToken: false } });
}

export type Caller = { userId: string } | null;

/** Resolve the signed-in (guest or member) user from a bearer token. */
export async function callerFromToken(token: string | null): Promise<Caller> {
  const admin = adminClient();
  if (!admin || !token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : { userId: data.user.id };
}

export function accountingConfigured(): boolean {
  return adminClient() !== null;
}

/** True when the user has no allowance left for the task in the last 24 hours. */
export async function overQuota(userId: string, task: AiTask, now = new Date()): Promise<boolean> {
  const admin = adminClient();
  if (!admin) return false;
  const { count, error } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('task', task)
    .gte('created_at', quotaWindowStart(now));
  if (error) throw new Error(`quota lookup failed: ${error.message}`);
  return isOverQuota(task, count ?? 0);
}

export async function recordUsage(input: {
  userId: string;
  task: AiTask;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}): Promise<void> {
  const admin = adminClient();
  if (!admin) return;
  const { error } = await admin.from('ai_usage').insert({
    user_id: input.userId,
    task: input.task,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    cache_read_tokens: input.cacheReadTokens,
  });
  if (error) throw new Error(`usage write failed: ${error.message}`);
}
