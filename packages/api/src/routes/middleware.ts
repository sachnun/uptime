import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { Env, JWTPayload } from '../types';
import { verifyJWT } from '../lib';
import { apiKeys, users } from '../db/schema';

const encoder = new TextEncoder();

async function hashApiKey(key: string): Promise<string> {
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

type AuthContext = {
  req: { header: (name: string) => string | undefined; method: string };
  env: Env;
  set: (key: string, value: unknown) => void;
  get: (key: string) => unknown;
  json: (data: unknown, status?: number) => Response;
};

export function createAuthMiddleware() {
  return async (c: AuthContext, next: () => Promise<void>) => {
    const apiKeyHeader = c.req.header('X-API-Key');

    if (apiKeyHeader) {
      const keyHash = await hashApiKey(apiKeyHeader);
      const db = drizzle(c.env.DB);

      const [result] = await db
        .select({
          apiKey: apiKeys,
          user: users,
        })
        .from(apiKeys)
        .innerJoin(users, eq(apiKeys.userId, users.id))
        .where(eq(apiKeys.keyHash, keyHash))
        .limit(1);

      if (!result) {
        return c.json({ error: 'Invalid API key' }, 401);
      }

      if (result.apiKey.expiresAt && result.apiKey.expiresAt < new Date()) {
        return c.json({ error: 'API key has expired' }, 401);
      }

      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, result.apiKey.id));

      const payload: JWTPayload = {
        sub: result.user.id,
        email: result.user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      };

      c.set('user', payload);
      c.set('isApiKey', true);
      await next();
      return;
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.slice(7);
    const payload = await verifyJWT(token, c.env.JWT_SECRET);

    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    c.set('user', payload);
    c.set('isApiKey', false);
    await next();
  };
}

export function requireJwtAuth() {
  return async (c: AuthContext, next: () => Promise<void>) => {
    const isApiKey = c.get('isApiKey');
    if (isApiKey) {
      return c.json({ error: 'API keys are read-only. Use JWT authentication for this operation.' }, 403);
    }
    await next();
  };
}

export type AuthVariables = {
  user: JWTPayload;
  isApiKey: boolean;
};
