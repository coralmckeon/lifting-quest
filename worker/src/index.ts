import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array, isoBase64URL } from '@simplewebauthn/server/helpers';

type Env = {
  DB: D1Database;
  KV: KVNamespace;
  RP_NAME: string;
  RP_ID: string;
  EXPECTED_ORIGIN: string;
  ALLOWED_ORIGIN: string;
  COOKIE_DOMAIN: string;
  COOKIE_SECURE: string;
};

const app = new Hono<{ Bindings: Env }>();

// ── Utilities ──────────────────────────────────────────────────────────────────

function rnd(len = 32): string {
  return Array.from(
    crypto.getRandomValues(new Uint8Array(len)),
    b => b.toString(16).padStart(2, '0'),
  ).join('').slice(0, len);
}

// ── CORS ───────────────────────────────────────────────────────────────────────

function resolveOrigin(reqOrigin: string | undefined, allowedRaw: string): string {
  const allowed = allowedRaw.split(',').map(s => s.trim());
  return (reqOrigin && allowed.includes(reqOrigin)) ? reqOrigin : allowed[0];
}

function expectedOrigins(raw: string): string[] {
  return raw.split(',').map(s => s.trim());
}

app.options('*', c => {
  const origin = resolveOrigin(c.req.header('Origin'), c.env.ALLOWED_ORIGIN || 'https://app.lifting.quest');
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
});

app.use('*', async (c, next) => {
  await next();
  const origin = resolveOrigin(c.req.header('Origin'), c.env.ALLOWED_ORIGIN || 'https://app.lifting.quest');
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Vary', 'Origin');
});

// ── Session helpers ────────────────────────────────────────────────────────────

async function getSessionUserId(c: ReturnType<typeof app.createContext>): Promise<string | null> {
  const token = getCookie(c, 'sess');
  if (!token) return null;
  return c.env.KV.get(`sess:${token}`);
}

function setSession(c: ReturnType<typeof app.createContext>, token: string): void {
  const domain = c.env.COOKIE_DOMAIN || '.lifting.quest';
  const secure = c.env.COOKIE_SECURE !== 'false';
  setCookie(c, 'sess', token, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    domain,
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
}

// ── Registration ───────────────────────────────────────────────────────────────

app.post('/auth/register/options', async c => {
  try {
    const { username, displayName } = await c.req.json<{ username: string; displayName: string }>();
    const userId = crypto.randomUUID();
    const flowId = rnd();

    const opts = await generateRegistrationOptions({
      rpName: c.env.RP_NAME || 'Lifting Quest',
      rpID: c.env.RP_ID || 'lifting.quest',
      userName: username || displayName,
      userID: isoUint8Array.fromUTF8String(userId),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    await c.env.KV.put(`chal:${flowId}`, JSON.stringify({
      challenge: opts.challenge,
      userId,
      displayName: displayName || username,
    }), { expirationTtl: 300 });

    return c.json({ options: opts, flowId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

app.post('/auth/register/verify', async c => {
  try {
    const { flowId, response } = await c.req.json<{ flowId: string; response: Record<string, unknown> }>();

    const raw = await c.env.KV.get(`chal:${flowId}`);
    if (!raw) return c.json({ error: 'Challenge expired' }, 400);

    const { challenge, userId, displayName } = JSON.parse(raw) as {
      challenge: string; userId: string; displayName: string;
    };
    await c.env.KV.delete(`chal:${flowId}`);

    const verification = await verifyRegistrationResponse({
      response: response as Parameters<typeof verifyRegistrationResponse>[0]['response'],
      expectedChallenge: challenge,
      expectedOrigin: expectedOrigins(c.env.EXPECTED_ORIGIN || 'https://app.lifting.quest'),
      expectedRPID: c.env.RP_ID || 'lifting.quest',
    });

    if (!verification.verified || !verification.registrationInfo) {
      return c.json({ error: 'Verification failed' }, 400);
    }

    const info = verification.registrationInfo;
    // v13: credential sub-object holds id/publicKey/counter/transports
    const credId    = (info as unknown as { credential: { id: string } }).credential?.id
                   ?? (info as unknown as { credentialID: string }).credentialID;
    const credPK    = (info as unknown as { credential: { publicKey: Uint8Array } }).credential?.publicKey
                   ?? (info as unknown as { credentialPublicKey: Uint8Array }).credentialPublicKey;
    const credCtr   = (info as unknown as { credential: { counter: number } }).credential?.counter
                   ?? (info as unknown as { counter: number }).counter;
    const credTrans = (info as unknown as { credential: { transports?: string[] } }).credential?.transports
                   ?? (info as unknown as { transports?: string[] }).transports;

    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO users (id, display_name, created_at) VALUES (?, ?, ?)',
    ).bind(userId, displayName, Date.now()).run();

    await c.env.DB.prepare(
      `INSERT INTO credentials
         (id, user_id, public_key, counter, transports, device_type, backed_up, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      credId,
      userId,
      isoBase64URL.fromBuffer(credPK),
      credCtr,
      JSON.stringify(credTrans ?? []),
      (info as unknown as { credentialDeviceType?: string }).credentialDeviceType ?? 'singleDevice',
      (info as unknown as { credentialBackedUp?: boolean }).credentialBackedUp ? 1 : 0,
      Date.now(),
    ).run();

    const token = rnd(32);
    await c.env.KV.put(`sess:${token}`, userId, { expirationTtl: 30 * 24 * 60 * 60 });
    setSession(c, token);

    return c.json({ verified: true, userId, displayName });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

// ── Login ──────────────────────────────────────────────────────────────────────

app.post('/auth/login/options', async c => {
  try {
    const flowId = rnd();
    const opts = await generateAuthenticationOptions({
      rpID: c.env.RP_ID || 'lifting.quest',
      allowCredentials: [],
      userVerification: 'preferred',
    });

    await c.env.KV.put(`chal:${flowId}`, JSON.stringify({
      challenge: opts.challenge,
    }), { expirationTtl: 300 });

    return c.json({ options: opts, flowId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

app.post('/auth/login/verify', async c => {
  try {
    const { flowId, response } = await c.req.json<{ flowId: string; response: Record<string, unknown> }>();

    const raw = await c.env.KV.get(`chal:${flowId}`);
    if (!raw) return c.json({ error: 'Challenge expired' }, 400);

    const { challenge } = JSON.parse(raw) as { challenge: string };
    await c.env.KV.delete(`chal:${flowId}`);

    type CredRow = { id: string; user_id: string; public_key: string; counter: number; transports: string | null };
    const cred = await c.env.DB.prepare(
      'SELECT id, user_id, public_key, counter, transports FROM credentials WHERE id = ?',
    ).bind(response.id).first<CredRow>();

    if (!cred) return c.json({ error: 'Credential not found' }, 400);

    const verification = await verifyAuthenticationResponse({
      response: response as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
      expectedChallenge: challenge,
      expectedOrigin: expectedOrigins(c.env.EXPECTED_ORIGIN || 'https://app.lifting.quest'),
      expectedRPID: c.env.RP_ID || 'lifting.quest',
      credential: {
        id: cred.id,
        publicKey: isoBase64URL.toBuffer(cred.public_key),
        counter: cred.counter,
        transports: cred.transports ? JSON.parse(cred.transports) : [],
      },
    });

    if (!verification.verified) return c.json({ error: 'Verification failed' }, 400);

    await c.env.DB.prepare(
      'UPDATE credentials SET counter = ? WHERE id = ?',
    ).bind(verification.authenticationInfo.newCounter, cred.id).run();

    type UserRow = { display_name: string };
    const usr = await c.env.DB.prepare(
      'SELECT display_name FROM users WHERE id = ?',
    ).bind(cred.user_id).first<UserRow>();

    const token = rnd(32);
    await c.env.KV.put(`sess:${token}`, cred.user_id, { expirationTtl: 30 * 24 * 60 * 60 });
    setSession(c, token);

    return c.json({ verified: true, userId: cred.user_id, displayName: usr?.display_name ?? '' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

// ── Auth helpers ───────────────────────────────────────────────────────────────

app.get('/auth/me', async c => {
  const userId = await getSessionUserId(c as Parameters<typeof getSessionUserId>[0]);
  if (!userId) return c.json({ authenticated: false }, 401);

  type UserRow = { display_name: string };
  const usr = await c.env.DB.prepare(
    'SELECT display_name FROM users WHERE id = ?',
  ).bind(userId).first<UserRow>();

  if (!usr) return c.json({ authenticated: false }, 401);
  return c.json({ authenticated: true, userId, displayName: usr.display_name });
});

app.post('/auth/logout', async c => {
  const token = getCookie(c, 'sess');
  if (token) await c.env.KV.delete(`sess:${token}`);
  const domain = c.env.COOKIE_DOMAIN || '.lifting.quest';
  deleteCookie(c, 'sess', { domain, path: '/' });
  return c.json({ ok: true });
});

// ── App state ──────────────────────────────────────────────────────────────────

app.get('/api/state', async c => {
  const userId = await getSessionUserId(c as Parameters<typeof getSessionUserId>[0]);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  type StateRow = { state: string };
  const row = await c.env.DB.prepare(
    'SELECT state FROM app_state WHERE user_id = ?',
  ).bind(userId).first<StateRow>();

  return c.json({ state: row?.state ? JSON.parse(row.state) : null });
});

app.put('/api/state', async c => {
  const userId = await getSessionUserId(c as Parameters<typeof getSessionUserId>[0]);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const { state } = await c.req.json<{ state: unknown }>();

  await c.env.DB.prepare(
    `INSERT INTO app_state (user_id, state, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
  ).bind(userId, JSON.stringify(state), Date.now()).run();

  return c.json({ ok: true });
});

export default app;
