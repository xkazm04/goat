import { NextRequest, NextResponse } from 'next/server';

/**
 * STOPGAP auth for the agent-bridge endpoints, which otherwise have NO auth at
 * all — anyone can create, read, or delete tasks. When AGENT_BRIDGE_SECRET is
 * configured, require `Authorization: Bearer <secret>`; when it is unset the
 * endpoints behave exactly as before (so local dev is unaffected).
 *
 * This is a shared-secret stopgap, NOT proper auth — a robust fix needs
 * per-agent API keys (the same missing api_keys infrastructure as the public
 * API). See docs/harness/followups-2026-06-16.md.
 *
 * @returns a 401 NextResponse to short-circuit the handler, or null to proceed.
 */
export function checkAgentBridgeSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.AGENT_BRIDGE_SECRET;
  if (!secret) return null; // not configured → unchanged behavior
  const header = request.headers.get('authorization');
  if (header === `Bearer ${secret}`) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
