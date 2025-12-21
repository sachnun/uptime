import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { createDb, notifications } from '../db';
import { createAuthMiddleware, type AuthVariables } from './middleware';
import type { Env } from '../types';

const notificationsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

notificationsRoute.use('*', createAuthMiddleware());

const createNotificationSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['webhook', 'discord', 'telegram', 'slack']),
  config: z.record(z.string()),
  active: z.boolean().default(true),
});

const updateNotificationSchema = createNotificationSchema.partial();

notificationsRoute.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const result = await db.query.notifications.findMany({
    orderBy: [desc(notifications.createdAt)],
  });
  return c.json(result);
});

notificationsRoute.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const db = createDb(c.env.DB);

  const notification = await db.query.notifications.findFirst({
    where: eq(notifications.id, id),
  });

  if (!notification) {
    return c.json({ error: 'Notification not found' }, 404);
  }

  return c.json(notification);
});

notificationsRoute.post('/', zValidator('json', createNotificationSchema), async (c) => {
  const data = c.req.valid('json');
  const db = createDb(c.env.DB);

  const result = await db.insert(notifications).values(data).returning();
  return c.json(result[0], 201);
});

notificationsRoute.put('/:id', zValidator('json', updateNotificationSchema), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const db = createDb(c.env.DB);

  const existing = await db.query.notifications.findFirst({
    where: eq(notifications.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Notification not found' }, 404);
  }

  const result = await db
    .update(notifications)
    .set(data)
    .where(eq(notifications.id, id))
    .returning();

  return c.json(result[0]);
});

notificationsRoute.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const db = createDb(c.env.DB);

  const existing = await db.query.notifications.findFirst({
    where: eq(notifications.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Notification not found' }, 404);
  }

  await db.delete(notifications).where(eq(notifications.id, id));
  return c.json({ success: true });
});

notificationsRoute.post('/:id/test', async (c) => {
  const id = parseInt(c.req.param('id'));
  const db = createDb(c.env.DB);

  const notification = await db.query.notifications.findFirst({
    where: eq(notifications.id, id),
  });

  if (!notification) {
    return c.json({ error: 'Notification not found' }, 404);
  }

  const { sendNotification } = await import('../notifications');
  
  try {
    await sendNotification(notification, {
      monitorName: 'Test Monitor',
      status: true,
      message: 'This is a test notification from Uptime.',
      responseTime: 100,
    });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to send notification', details: String(error) }, 500);
  }
});

export { notificationsRoute };
