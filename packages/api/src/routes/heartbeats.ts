import { Hono } from 'hono';
import { eq, desc, and, gte } from 'drizzle-orm';
import { createDb, heartbeats, monitors, incidents, hourlyStats } from '../db';
import { createAuthMiddleware, type AuthVariables } from './middleware';
import type { Env } from '../types';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

const heartbeatsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

heartbeatsRoute.use('*', createAuthMiddleware());

heartbeatsRoute.get('/:monitorId', async (c) => {
  const monitorId = parseId(c.req.param('monitorId'));
  if (monitorId === null) {
    return c.json({ error: 'Invalid monitor ID' }, 400);
  }
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
  const monitorId = parseId(c.req.param('monitorId'));
  if (monitorId === null) {
    return c.json({ error: 'Invalid monitor ID' }, 400);
  }
  const user = c.get('user');
  const db = createDb(c.env.DB);

  const monitor = await db.query.monitors.findFirst({
    where: and(eq(monitors.id, monitorId), eq(monitors.userId, user.sub)),
  });

  if (!monitor) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const beats30d = await db.query.heartbeats.findMany({
    where: and(eq(heartbeats.monitorId, monitorId), gte(heartbeats.createdAt, last30d)),
    orderBy: [desc(heartbeats.createdAt)],
  });

  const now = Date.now();
  const last24hMs = now - 24 * 60 * 60 * 1000;
  const last7dMs = now - 7 * 24 * 60 * 60 * 1000;

  const beats24h = beats30d.filter(b => b.createdAt && b.createdAt.getTime() >= last24hMs);
  const beats7d = beats30d.filter(b => b.createdAt && b.createdAt.getTime() >= last7dMs);

  const calcStats = (beats: typeof beats30d) => {
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

heartbeatsRoute.get('/:monitorId/incidents', async (c) => {
  const monitorId = parseId(c.req.param('monitorId'));
  if (monitorId === null) {
    return c.json({ error: 'Invalid monitor ID' }, 400);
  }
  const user = c.get('user');
  const db = createDb(c.env.DB);

  const monitor = await db.query.monitors.findFirst({
    where: and(eq(monitors.id, monitorId), eq(monitors.userId, user.sub)),
  });

  if (!monitor) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  const result = await db.query.incidents.findMany({
    where: eq(incidents.monitorId, monitorId),
    orderBy: [desc(incidents.startedAt)],
    limit: 50,
  });

  return c.json(result);
});

heartbeatsRoute.get('/:monitorId/hourly', async (c) => {
  const monitorId = parseId(c.req.param('monitorId'));
  if (monitorId === null) {
    return c.json({ error: 'Invalid monitor ID' }, 400);
  }
  const days = parseInt(c.req.query('days') || '7');
  const user = c.get('user');
  const db = createDb(c.env.DB);

  const monitor = await db.query.monitors.findFirst({
    where: and(eq(monitors.id, monitorId), eq(monitors.userId, user.sub)),
  });

  if (!monitor) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const result = await db.query.hourlyStats.findMany({
    where: and(
      eq(hourlyStats.monitorId, monitorId),
      gte(hourlyStats.hour, since)
    ),
    orderBy: [desc(hourlyStats.hour)],
  });

  return c.json(result);
});

export { heartbeatsRoute };
