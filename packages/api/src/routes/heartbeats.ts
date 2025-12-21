import { Hono } from 'hono';
import { eq, desc, and, gte } from 'drizzle-orm';
import { createDb, heartbeats, monitors } from '../db';
import { createAuthMiddleware, type AuthVariables } from './middleware';
import type { Env } from '../types';

const heartbeatsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

heartbeatsRoute.use('*', createAuthMiddleware());

heartbeatsRoute.get('/:monitorId', async (c) => {
  const monitorId = parseInt(c.req.param('monitorId'));
  const hours = parseInt(c.req.query('hours') || '24');
  const limit = parseInt(c.req.query('limit') || '100');
  const user = c.get('user');
  const db = createDb(c.env.DB);

  const monitor = await db.query.monitors.findFirst({
    where: and(eq(monitors.id, monitorId), eq(monitors.userId, user.sub)),
  });

  if (!monitor) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const result = await db.query.heartbeats.findMany({
    where: and(
      eq(heartbeats.monitorId, monitorId),
      gte(heartbeats.createdAt, since)
    ),
    orderBy: [desc(heartbeats.createdAt)],
    limit,
  });

  return c.json(result);
});

heartbeatsRoute.get('/:monitorId/stats', async (c) => {
  const monitorId = parseInt(c.req.param('monitorId'));
  const user = c.get('user');
  const db = createDb(c.env.DB);

  const monitor = await db.query.monitors.findFirst({
    where: and(eq(monitors.id, monitorId), eq(monitors.userId, user.sub)),
  });

  if (!monitor) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [beats24h, beats7d, beats30d] = await Promise.all([
    db.query.heartbeats.findMany({
      where: and(eq(heartbeats.monitorId, monitorId), gte(heartbeats.createdAt, last24h)),
    }),
    db.query.heartbeats.findMany({
      where: and(eq(heartbeats.monitorId, monitorId), gte(heartbeats.createdAt, last7d)),
    }),
    db.query.heartbeats.findMany({
      where: and(eq(heartbeats.monitorId, monitorId), gte(heartbeats.createdAt, last30d)),
    }),
  ]);

  const calcStats = (beats: typeof beats24h) => {
    if (beats.length === 0) return { uptime: 0, avgResponseTime: 0, totalChecks: 0 };
    const upCount = beats.filter(b => b.status).length;
    const avgResponse = beats.reduce((sum, b) => sum + (b.responseTime || 0), 0) / beats.length;
    return {
      uptime: Math.round((upCount / beats.length) * 10000) / 100,
      avgResponseTime: Math.round(avgResponse),
      totalChecks: beats.length,
    };
  };

  return c.json({
    last24h: calcStats(beats24h),
    last7d: calcStats(beats7d),
    last30d: calcStats(beats30d),
  });
});

export { heartbeatsRoute };
