import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod/v4';
import { apiKeys } from '../db/schema';
import { createAuthMiddleware, requireJwtAuth, type AuthVariables } from './middleware';
import type { Env } from '../types';

const apiKeysRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

apiKeysRoute.use('*', createAuthMiddleware());
apiKeysRoute.use('*', requireJwtAuth());

const encoder = new TextEncoder();

async function hashApiKey(key: string): Promise<string> {
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateApiKey(): { key: string; prefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const prefix = `up_${key.slice(0, 8)}`;
  return { key: `up_${key}`, prefix };
}

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional(),
});

apiKeysRoute.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.sub));

  return c.json(keys);
});

apiKeysRoute.post('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 400);
  }

  const { key, prefix } = generateApiKey();
  const keyHash = await hashApiKey(key);

  const [created] = await db
    .insert(apiKeys)
    .values({
      userId: user.sub,
      name: parsed.data.name,
      keyHash,
      prefix,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    })
    .returning();

  return c.json({
    id: created.id,
    name: created.name,
    key,
    prefix,
    expiresAt: created.expiresAt,
    createdAt: created.createdAt,
  }, 201);
});

apiKeysRoute.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = parseInt(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const [deleted] = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.sub)))
    .returning();

  if (!deleted) {
    return c.json({ error: 'API key not found' }, 404);
  }

  return c.json({ success: true });
});

export { apiKeysRoute, hashApiKey };
