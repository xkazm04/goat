import { describe, expect, it, vi } from 'vitest';

import { ensureSession, type GuestAuth } from './session';

function fakeAuth(current: GuestAuth['getUser'], anon: GuestAuth['signInAnonymously']): GuestAuth {
  return { getUser: vi.fn(current), signInAnonymously: vi.fn(anon) };
}

const none = async () => ({ data: { user: null }, error: null });

describe('ensureSession', () => {
  it('is offline when Supabase is not configured', async () => {
    expect(await ensureSession(null)).toEqual({ status: 'offline' });
  });

  it('keeps an existing member session without signing in again', async () => {
    const auth = fakeAuth(async () => ({ data: { user: { id: 'u1', is_anonymous: false } }, error: null }), none);
    expect(await ensureSession(auth)).toEqual({ status: 'member', userId: 'u1' });
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('keeps an existing guest session', async () => {
    const auth = fakeAuth(async () => ({ data: { user: { id: 'g1', is_anonymous: true } }, error: null }), none);
    expect(await ensureSession(auth)).toEqual({ status: 'guest', userId: 'g1' });
  });

  it('signs in anonymously when there is no user yet', async () => {
    const auth = fakeAuth(none, async () => ({ data: { user: { id: 'g2', is_anonymous: true } }, error: null }));
    expect(await ensureSession(auth)).toEqual({ status: 'guest', userId: 'g2' });
    expect(auth.signInAnonymously).toHaveBeenCalledOnce();
  });

  it('reports the provider error when anonymous sign-in is disabled', async () => {
    const auth = fakeAuth(none, async () => ({
      data: { user: null },
      error: { message: 'Anonymous sign-ins are disabled' },
    }));
    expect(await ensureSession(auth)).toEqual({ status: 'error', message: 'Anonymous sign-ins are disabled' });
  });
});
