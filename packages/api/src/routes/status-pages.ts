import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, inArray } from 'drizzle-orm';
import { createDb, statusPages, statusPageMonitors, monitors, heartbeats } from '../db';
import { createAuthMiddleware, type AuthVariables } from './middleware';
import type { Env } from '../types';

const statusPagesRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const createStatusPageSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  published: z.boolean().default(false),
  monitorIds: z.array(z.number()).optional(),
});

const updateStatusPageSchema = createStatusPageSchema.partial();

statusPagesRoute.get('/public/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = createDb(c.env.DB);

  const page = await db.query.statusPages.findFirst({
    where: eq(statusPages.slug, slug),
  });

  if (!page || !page.published) {
    return c.json({ error: 'Status page not found' }, 404);
  }

  const pageMonitors = await db.query.statusPageMonitors.findMany({
    where: eq(statusPageMonitors.statusPageId, page.id),
  });

  if (pageMonitors.length === 0) {
    return c.json({ ...page, monitors: [] });
  }

  const monitorIds = pageMonitors.map(pm => pm.monitorId);
  const monitorList = await db.query.monitors.findMany({
    where: inArray(monitors.id, monitorIds),
  });

  const monitorsWithStatus = await Promise.all(
    monitorList.map(async (monitor) => {
      const recentHeartbeats = await db.query.heartbeats.findMany({
        where: eq(heartbeats.monitorId, monitor.id),
        orderBy: [desc(heartbeats.createdAt)],
        limit: 90,
      });

      const latestHeartbeat = recentHeartbeats[0];
      const upCount = recentHeartbeats.filter(h => h.status).length;
      const uptime = recentHeartbeats.length > 0 ? (upCount / recentHeartbeats.length) * 100 : 0;

      return {
        id: monitor.id,
        name: monitor.name,
        status: latestHeartbeat?.status ?? null,
        uptime: Math.round(uptime * 100) / 100,
        heartbeats: recentHeartbeats.map(h => ({
          status: h.status,
          responseTime: h.responseTime,
          createdAt: h.createdAt,
        })),
      };
    })
  );

  return c.json({ ...page, monitors: monitorsWithStatus });
});

statusPagesRoute.use('*', createAuthMiddleware());

statusPagesRoute.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const pages = await db.query.statusPages.findMany({
    orderBy: [desc(statusPages.createdAt)],
  });

  const pagesWithMonitors = await Promise.all(
    pages.map(async (page) => {
      const pageMonitors = await db.query.statusPageMonitors.findMany({
        where: eq(statusPageMonitors.statusPageId, page.id),
      });
      return { ...page, monitorIds: pageMonitors.map(pm => pm.monitorId) };
    })
  );

  return c.json(pagesWithMonitors);
});

statusPagesRoute.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const db = createDb(c.env.DB);

  const page = await db.query.statusPages.findFirst({
    where: eq(statusPages.id, id),
  });

  if (!page) {
    return c.json({ error: 'Status page not found' }, 404);
  }

  const pageMonitors = await db.query.statusPageMonitors.findMany({
    where: eq(statusPageMonitors.statusPageId, id),
  });

  return c.json({ ...page, monitorIds: pageMonitors.map(pm => pm.monitorId) });
});

statusPagesRoute.post('/', zValidator('json', createStatusPageSchema), async (c) => {
  const data = c.req.valid('json');
  const { monitorIds, ...pageData } = data;
  const db = createDb(c.env.DB);

  const existing = await db.query.statusPages.findFirst({
    where: eq(statusPages.slug, pageData.slug),
  });

  if (existing) {
    return c.json({ error: 'Slug already exists' }, 400);
  }

  const result = await db.insert(statusPages).values(pageData).returning();
  const page = result[0];

  if (monitorIds && monitorIds.length > 0) {
    await db.insert(statusPageMonitors).values(
      monitorIds.map((monitorId, index) => ({
        statusPageId: page.id,
        monitorId,
        order: index,
      }))
    );
  }

  return c.json({ ...page, monitorIds: monitorIds ?? [] }, 201);
});

statusPagesRoute.put('/:id', zValidator('json', updateStatusPageSchema), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const { monitorIds, ...pageData } = data;
  const db = createDb(c.env.DB);

  const existing = await db.query.statusPages.findFirst({
    where: eq(statusPages.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Status page not found' }, 404);
  }

  if (pageData.slug && pageData.slug !== existing.slug) {
    const slugExists = await db.query.statusPages.findFirst({
      where: eq(statusPages.slug, pageData.slug),
    });
    if (slugExists) {
      return c.json({ error: 'Slug already exists' }, 400);
    }
  }

  const result = await db
    .update(statusPages)
    .set(pageData)
    .where(eq(statusPages.id, id))
    .returning();

  if (monitorIds !== undefined) {
    await db.delete(statusPageMonitors).where(eq(statusPageMonitors.statusPageId, id));
    if (monitorIds.length > 0) {
      await db.insert(statusPageMonitors).values(
        monitorIds.map((monitorId, index) => ({
          statusPageId: id,
          monitorId,
          order: index,
        }))
      );
    }
  }

  const updatedMonitors = await db.query.statusPageMonitors.findMany({
    where: eq(statusPageMonitors.statusPageId, id),
  });

  return c.json({ ...result[0], monitorIds: updatedMonitors.map(pm => pm.monitorId) });
});

statusPagesRoute.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const db = createDb(c.env.DB);

  const existing = await db.query.statusPages.findFirst({
    where: eq(statusPages.id, id),
  });

  if (!existing) {
    return c.json({ error: 'Status page not found' }, 404);
  }

  await db.delete(statusPages).where(eq(statusPages.id, id));
  return c.json({ success: true });
});

export { statusPagesRoute };
