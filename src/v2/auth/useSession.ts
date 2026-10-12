'use client';

import { useEffect, useState } from 'react';

import { getBrowserClient } from '@/v2/db/browser';

import { ensureSession, type SessionState } from './session';

type Pending = { status: 'connecting' };

/** Resolve (or create) the visitor's session once, on mount. */
export function useSession(): SessionState | Pending {
  const [state, setState] = useState<SessionState | Pending>({ status: 'connecting' });

  useEffect(() => {
    let cancelled = false;
    const client = getBrowserClient();
    ensureSession(client ? client.auth : null)
      .catch((error: unknown): SessionState => ({
        status: 'error',
        message: error instanceof Error ? error.message : 'Session check failed',
      }))
      .then((next) => {
        if (!cancelled) setState(next);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
