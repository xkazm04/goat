/**
 * Who is using v2 right now. Every visitor gets a real Supabase user: a guest
 * is an anonymous sign-in, and signing up later links an identity to the same
 * user id, so nothing has to be merged (v1's /api/auth/merge-guest goes away).
 */
export type SessionState =
  | { status: 'offline' }
  | { status: 'guest'; userId: string }
  | { status: 'member'; userId: string }
  | { status: 'error'; message: string };

type AuthUser = { id: string; is_anonymous?: boolean };
type AuthResult = { data: { user: AuthUser | null }; error: { message: string } | null };

/** The slice of supabase.auth this module needs, so tests can pass a fake. */
export interface GuestAuth {
  getUser(): Promise<AuthResult>;
  signInAnonymously(): Promise<AuthResult>;
}

function fromUser(user: AuthUser): SessionState {
  return user.is_anonymous ? { status: 'guest', userId: user.id } : { status: 'member', userId: user.id };
}

/**
 * Resolve the current user, signing in anonymously when there is none.
 * `auth` is null when Supabase is not configured.
 */
export async function ensureSession(auth: GuestAuth | null): Promise<SessionState> {
  if (!auth) return { status: 'offline' };

  const current = await auth.getUser();
  if (current.data.user) return fromUser(current.data.user);

  const created = await auth.signInAnonymously();
  if (created.error || !created.data.user) {
    return { status: 'error', message: created.error?.message ?? 'Anonymous sign-in returned no user' };
  }
  return fromUser(created.data.user);
}
