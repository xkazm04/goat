'use client';

import { useSession } from '@/v2/auth/useSession';

const LABEL = {
  connecting: 'Connecting…',
  offline: 'Offline preview: Supabase is not configured',
  guest: 'Guest session',
  member: 'Signed in',
  error: 'Session unavailable',
} as const;

/** Shows whether the visitor has a session, which every v2 write will need. */
export function SessionChip() {
  const session = useSession();
  const title = session.status === 'error' ? session.message : undefined;
  return (
    <span className="v2-chip v2-glass" data-status={session.status} title={title} role="status">
      <i aria-hidden="true" />
      {LABEL[session.status]}
    </span>
  );
}
