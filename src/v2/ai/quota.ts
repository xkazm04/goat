/** Per-user daily limits by task, counted from goat_v2.ai_usage (§4 guardrails). */
export const DAILY_LIMITS = {
  pool: 10,
  /** Critic replies, one per user message. */
  critic: 60,
  gaps: 20,
  tag: 10,
} as const;

export type AiTask = keyof typeof DAILY_LIMITS;

export function quotaWindowStart(now: Date): string {
  return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
}

export function isOverQuota(task: AiTask, usedInWindow: number): boolean {
  return usedInWindow >= DAILY_LIMITS[task];
}
