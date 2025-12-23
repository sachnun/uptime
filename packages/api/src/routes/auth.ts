import { Hono } from 'hono';
import type { Context } from 'hono';
import { eq, and } from 'drizzle-orm';
import { createDb, users } from '../db';
import { signJWT, verifyJWT } from '../lib';
import type { Env } from '../types';

const auth = new Hono<{ Bindings: Env }>();

type OAuthProvider = 'github' | 'google';

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GoogleUser {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

function getOrigin(c: Context<{ Bindings: Env }>): string {
  const url = new URL(c.req.url);
  return url.origin;
}

async function getGitHubAccessToken(code: string, env: Env): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await response.json() as { access_token?: string; error?: string };
  if (data.error || !data.access_token) {
    throw new Error(data.error || 'Failed to get GitHub access token');
  }
  return data.access_token;
}

async function getGitHubUser(accessToken: string): Promise<{ user: GitHubUser; email: string }> {
  const [userRes, emailsRes] = await Promise.all([
    fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'Uptime-App' },
    }),
    fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'Uptime-App' },
    }),
  ]);

  const user = await userRes.json() as GitHubUser;
  const emails = await emailsRes.json() as GitHubEmail[];
  const primaryEmail = emails.find((e) => e.primary && e.verified)?.email || user.email;

  if (!primaryEmail) {
    throw new Error('No verified email found');
  }

  return { user, email: primaryEmail };
}

async function getGoogleAccessToken(code: string, redirectUri: string, env: Env): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json() as { access_token?: string; error?: string };
  if (data.error || !data.access_token) {
    throw new Error(data.error || 'Failed to get Google access token');
  }
  return data.access_token;
}

async function getGoogleUser(accessToken: string): Promise<GoogleUser> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.json() as Promise<GoogleUser>;
}

async function findOrCreateUser(
  db: ReturnType<typeof createDb>,
  provider: OAuthProvider,
  providerId: string,
  email: string,
  name: string | null,
  avatar: string | null
) {
  let user = await db.query.users.findFirst({
    where: and(eq(users.provider, provider), eq(users.providerId, providerId)),
  });

  if (!user) {
    user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (user) {
      await db
        .update(users)
        .set({ provider, providerId, name, avatar })
        .where(eq(users.id, user.id));
      user = { ...user, provider, providerId, name, avatar };
    } else {
      const result = await db
        .insert(users)
        .values({ email, name, avatar, provider, providerId })
        .returning();
      user = result[0];
    }
  }

  return user;
}

auth.get('/github', (c) => {
  const origin = getOrigin(c);
  const params = new URLSearchParams({
    client_id: c.env.GITHUB_CLIENT_ID,
    redirect_uri: `${origin}/api/auth/github/callback`,
    scope: 'read:user user:email',
  });
  return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

auth.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.redirect('/login?error=missing_code');
  }

  try {
    const accessToken = await getGitHubAccessToken(code, c.env);
    const { user: ghUser, email } = await getGitHubUser(accessToken);
    const db = createDb(c.env.DB);

    const user = await findOrCreateUser(
      db,
      'github',
      String(ghUser.id),
      email,
      ghUser.name || ghUser.login,
      ghUser.avatar_url
    );

    const token = await signJWT(
      { sub: user.id, email: user.email },
      c.env.JWT_SECRET,
      86400 * 7
    );

    c.header('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${86400 * 7}`);
    return c.redirect('/');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth failed';
    return c.redirect(`/login?error=${encodeURIComponent(message)}`);
  }
});

auth.get('/google', (c) => {
  const origin = getOrigin(c);
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

auth.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.redirect('/login?error=missing_code');
  }

  try {
    const origin = getOrigin(c);
    const redirectUri = `${origin}/api/auth/google/callback`;
    const accessToken = await getGoogleAccessToken(code, redirectUri, c.env);
    const gUser = await getGoogleUser(accessToken);
    const db = createDb(c.env.DB);

    const user = await findOrCreateUser(
      db,
      'google',
      gUser.sub,
      gUser.email,
      gUser.name,
      gUser.picture
    );

    const token = await signJWT(
      { sub: user.id, email: user.email },
      c.env.JWT_SECRET,
      86400 * 7
    );

    c.header('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${86400 * 7}`);
    return c.redirect('/');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth failed';
    return c.redirect(`/login?error=${encodeURIComponent(message)}`);
  }
});

auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  const db = createDb(c.env.DB);
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub as number),
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
  });
});

auth.delete('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  const db = createDb(c.env.DB);
  await db.delete(users).where(eq(users.id, payload.sub as number));

  return c.json({ success: true });
});

auth.post('/logout', async (c) => {
  c.header('Set-Cookie', 'token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return c.json({ success: true });
});

export { auth };
