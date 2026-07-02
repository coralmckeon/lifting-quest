import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

// Workers.dev URL (interim). Switch to https://api.lifting.quest once
// the lifting.quest zone is added to Cloudflare and the route is enabled.
const BASE = 'https://lifting-quest-api.black-silence-26e0.workers.dev';

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json() as { error?: string }; msg = j.error ?? msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export interface AuthUser { userId: string; displayName: string }

export async function checkAuth(): Promise<AuthUser | null> {
  try {
    const r = await req<{ authenticated: boolean; userId?: string; displayName?: string }>(
      'GET', '/auth/me'
    );
    if (r.authenticated && r.userId) {
      return { userId: r.userId, displayName: r.displayName ?? '' };
    }
    return null;
  } catch {
    return null;
  }
}

export async function passkeyRegister(displayName: string): Promise<AuthUser> {
  const { options, flowId } = await req<{ options: unknown; flowId: string }>(
    'POST', '/auth/register/options', { username: displayName, displayName }
  );
  const response = await startRegistration({ optionsJSON: options as Parameters<typeof startRegistration>[0]['optionsJSON'] });
  const r = await req<{ verified: boolean; userId: string; displayName: string }>(
    'POST', '/auth/register/verify', { flowId, response }
  );
  if (!r.verified) throw new Error('Registration failed');
  return { userId: r.userId, displayName: r.displayName };
}

export async function passkeyLogin(): Promise<AuthUser> {
  const { options, flowId } = await req<{ options: unknown; flowId: string }>(
    'POST', '/auth/login/options'
  );
  const response = await startAuthentication({ optionsJSON: options as Parameters<typeof startAuthentication>[0]['optionsJSON'] });
  const r = await req<{ verified: boolean; userId: string; displayName: string }>(
    'POST', '/auth/login/verify', { flowId, response }
  );
  if (!r.verified) throw new Error('Login failed');
  return { userId: r.userId, displayName: r.displayName };
}

export async function logout(): Promise<void> {
  await req('POST', '/auth/logout');
}

export async function getState<T>(): Promise<T | null> {
  const r = await req<{ state: T | null }>('GET', '/api/state');
  return r.state;
}

export async function putState<T>(state: T): Promise<void> {
  await req('PUT', '/api/state', { state });
}
