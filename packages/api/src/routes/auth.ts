import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createDb, users } from '../db';
import { signJWT, verifyJWT, hashPassword, verifyPassword } from '../lib';
import type { Env } from '../types';

const auth = new Hono<{ Bindings: Env }>();

const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json');
  const db = createDb(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = await signJWT(
    { sub: user.id, username: user.username },
    c.env.JWT_SECRET,
    86400 * 7
  );

  return c.json({ token, user: { id: user.id, username: user.username } });
});

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { username, password } = c.req.valid('json');
  const db = createDb(c.env.DB);

  const existingUser = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existingUser) {
    return c.json({ error: 'Username already exists' }, 400);
  }

  const userCount = await db.select().from(users);
  if (userCount.length > 0) {
    return c.json({ error: 'Registration disabled. Only one admin user allowed.' }, 403);
  }

  const passwordHash = await hashPassword(password);
  const result = await db.insert(users).values({ username, passwordHash }).returning();
  const user = result[0];

  const token = await signJWT(
    { sub: user.id, username: user.username },
    c.env.JWT_SECRET,
    86400 * 7
  );

  return c.json({ token, user: { id: user.id, username: user.username } }, 201);
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

  return c.json({ user: { id: payload.sub, username: payload.username } });
});

auth.get('/setup', async (c) => {
  const db = createDb(c.env.DB);
  const userCount = await db.select().from(users);
  return c.json({ needsSetup: userCount.length === 0 });
});

export { auth };
