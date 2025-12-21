import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { createDb, monitors, heartbeats, monitorNotifications, notifications } from '../db';
import { createAuthMiddleware, type AuthVariables } from './middleware';
import { runMonitorCheck } from '../monitors';
import type { Env } from '../types';

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

const monitorsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

monitorsRoute.use('*', createAuthMiddleware());

const createMonitorSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['http', 'https', 'tcp', 'dns']),
  url: z.string().url().optional(),
  hostname: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']).default('GET'),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  expectedBody: z.string().max(500).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  dnsRecordType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS']).optional(),
  interval: z.number().int().min(60).max(86400).default(60),
  timeout: z.number().int().min(1).max(120).default(30),
  retries: z.number().int().min(0).max(5).default(0),
  active: z.boolean().default(true),
  maintenanceStart: z.string().datetime().optional(),
  maintenanceEnd: z.string().datetime().optional(),
  notificationIds: z.array(z.number()).optional(),
});

const testMonitorSchema = z.object({
  type: z.enum(['http', 'https', 'tcp', 'dns']),
  url: z.string().url().optional(),
  hostname: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']).default('GET'),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  expectedBody: z.string().max(500).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  dnsRecordType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS']).optional(),
  timeout: z.number().int().min(1).max(30).default(10),
});

const updateMonitorSchema = createMonitorSchema.partial();

monitorsRoute.get('/', async (c) => {
  const user = c.get('user');
  const db = createDb(c.env.DB);
  const allMonitors = await db.query.monitors.findMany({
    where: eq(monitors.userId, user.sub),
    orderBy: [desc(monitors.createdAt)],
  });

  if (allMonitors.length === 0) {
    return c.json([]);
  }

  const monitorIds = allMonitors.map(m => m.id);

  const allHeartbeats = await db.query.heartbeats.findMany({
    where: inArray(heartbeats.monitorId, monitorIds),
    orderBy: [desc(heartbeats.createdAt)],
  });

  const heartbeatsByMonitor = new Map<number, typeof allHeartbeats>();
  for (const hb of allHeartbeats) {
    const existing = heartbeatsByMonitor.get(hb.monitorId) || [];
    existing.push(hb);
    heartbeatsByMonitor.set(hb.monitorId, existing);
  }

  const result = allMonitors.map((monitor) => {
    const monitorHeartbeats = heartbeatsByMonitor.get(monitor.id) || [];
    const recentHeartbeats = monitorHeartbeats.slice(0, 50);
    const latestHeartbeat = monitorHeartbeats[0] || null;

    const upCount = recentHeartbeats.filter(h => h.status).length;
    const uptime = recentHeartbeats.length > 0 ? (upCount / recentHeartbeats.length) * 100 : 0;

    return {
      ...monitor,
      latestHeartbeat,
      uptime: Math.round(uptime * 100) / 100,
      avgResponseTime: recentHeartbeats.length > 0
        ? Math.round(recentHeartbeats.reduce((sum, h) => sum + (h.responseTime || 0), 0) / recentHeartbeats.length)
        : 0,
    };
  });

  return c.json(result);
});

monitorsRoute.get('/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) {
    return c.json({ error: 'Invalid monitor ID' }, 400);
  }
  const user = c.get('user');
  const db = createDb(c.env.DB);

  const monitor = await db.query.monitors.findFirst({
    where: and(eq(monitors.id, id), eq(monitors.userId, user.sub)),
  });

  if (!monitor) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  const notifications = await db.query.monitorNotifications.findMany({
    where: eq(monitorNotifications.monitorId, id),
  });

  return c.json({ ...monitor, notificationIds: notifications.map(n => n.notificationId) });
});

monitorsRoute.post('/', zValidator('json', createMonitorSchema), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const { notificationIds, maintenanceStart, maintenanceEnd, ...monitorData } = data;
  const db = createDb(c.env.DB);

  if (notificationIds && notificationIds.length > 0) {
    const validNotifications = await db.query.notifications.findMany({
      where: and(
        inArray(notifications.id, notificationIds),
        eq(notifications.userId, user.sub)
      ),
    });
    if (validNotifications.length !== notificationIds.length) {
      return c.json({ error: 'Invalid notification IDs' }, 400);
    }
  }

  const insertData = {
    ...monitorData,
    userId: user.sub,
    maintenanceStart: maintenanceStart ? new Date(maintenanceStart) : null,
    maintenanceEnd: maintenanceEnd ? new Date(maintenanceEnd) : null,
  };

  const result = await db.insert(monitors).values(insertData).returning();
  const monitor = result[0];

  if (notificationIds && notificationIds.length > 0) {
    await db.insert(monitorNotifications).values(
      notificationIds.map(notificationId => ({
        monitorId: monitor.id,
        notificationId,
      }))
    );
  }

  return c.json(monitor, 201);
});

monitorsRoute.put('/:id', zValidator('json', updateMonitorSchema), async (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) {
    return c.json({ error: 'Invalid monitor ID' }, 400);
  }
  const user = c.get('user');
  const data = c.req.valid('json');
  const { notificationIds, maintenanceStart, maintenanceEnd, ...monitorData } = data;
  const db = createDb(c.env.DB);

  const existing = await db.query.monitors.findFirst({
    where: and(eq(monitors.id, id), eq(monitors.userId, user.sub)),
  });

  if (!existing) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  if (notificationIds && notificationIds.length > 0) {
    const validNotifications = await db.query.notifications.findMany({
      where: and(
        inArray(notifications.id, notificationIds),
        eq(notifications.userId, user.sub)
      ),
    });
    if (validNotifications.length !== notificationIds.length) {
      return c.json({ error: 'Invalid notification IDs' }, 400);
    }
  }

  const updateData: Record<string, unknown> = {
    ...monitorData,
    updatedAt: new Date(),
  };
  if (maintenanceStart !== undefined) {
    updateData.maintenanceStart = maintenanceStart ? new Date(maintenanceStart) : null;
  }
  if (maintenanceEnd !== undefined) {
    updateData.maintenanceEnd = maintenanceEnd ? new Date(maintenanceEnd) : null;
  }

  const result = await db
    .update(monitors)
    .set(updateData)
    .where(eq(monitors.id, id))
    .returning();

  if (notificationIds !== undefined) {
    await db.delete(monitorNotifications).where(eq(monitorNotifications.monitorId, id));
    if (notificationIds.length > 0) {
      await db.insert(monitorNotifications).values(
        notificationIds.map(notificationId => ({
          monitorId: id,
          notificationId,
        }))
      );
    }
  }

  return c.json(result[0]);
});

monitorsRoute.delete('/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) {
    return c.json({ error: 'Invalid monitor ID' }, 400);
  }
  const user = c.get('user');
  const db = createDb(c.env.DB);

  const existing = await db.query.monitors.findFirst({
    where: and(eq(monitors.id, id), eq(monitors.userId, user.sub)),
  });

  if (!existing) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  await db.delete(monitors).where(eq(monitors.id, id));
  return c.json({ success: true });
});

monitorsRoute.post('/:id/pause', async (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) {
    return c.json({ error: 'Invalid monitor ID' }, 400);
  }
  const user = c.get('user');
  const db = createDb(c.env.DB);

  const existing = await db.query.monitors.findFirst({
    where: and(eq(monitors.id, id), eq(monitors.userId, user.sub)),
  });

  if (!existing) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  await db.update(monitors).set({ active: false }).where(eq(monitors.id, id));
  return c.json({ success: true });
});

monitorsRoute.post('/:id/resume', async (c) => {
  const id = parseId(c.req.param('id'));
  if (id === null) {
    return c.json({ error: 'Invalid monitor ID' }, 400);
  }
  const user = c.get('user');
  const db = createDb(c.env.DB);

  const existing = await db.query.monitors.findFirst({
    where: and(eq(monitors.id, id), eq(monitors.userId, user.sub)),
  });

  if (!existing) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  await db.update(monitors).set({ active: true }).where(eq(monitors.id, id));
  return c.json({ success: true });
});

monitorsRoute.post('/test', zValidator('json', testMonitorSchema), async (c) => {
  const data = c.req.valid('json');

  const mockMonitor = {
    id: 0,
    userId: 0,
    name: 'Test',
    type: data.type,
    url: data.url || null,
    hostname: data.hostname || null,
    port: data.port || null,
    method: data.method || 'GET',
    expectedStatus: data.expectedStatus || 200,
    expectedBody: data.expectedBody || null,
    headers: data.headers || null,
    dnsRecordType: data.dnsRecordType || null,
    interval: 60,
    timeout: data.timeout || 10,
    retries: 0,
    active: true,
    maintenanceStart: null,
    maintenanceEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await runMonitorCheck(mockMonitor);

  return c.json({
    success: result.status,
    statusCode: result.statusCode,
    responseTime: result.responseTime,
    message: result.message,
  });
});

export { monitorsRoute };
