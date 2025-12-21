import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types';
import { verifyJWT } from '../lib';

export function createAuthMiddleware() {
  return async (c: { req: { header: (name: string) => string | undefined }; env: Env; set: (key: string, value: unknown) => void; json: (data: unknown, status?: number) => Response }, next: () => Promise<void>) => {
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
    await next();
  };
}

export type AuthVariables = {
  user: JWTPayload;
};
