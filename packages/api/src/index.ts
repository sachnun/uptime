import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth, monitorsRoute, heartbeatsRoute, notificationsRoute, statusPagesRoute, apiKeysRoute } from './routes';
import { handleScheduled } from './cron';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

app.route('/api/auth', auth);
app.route('/api/monitors', monitorsRoute);
app.route('/api/heartbeats', heartbeatsRoute);
app.route('/api/notifications', notificationsRoute);
app.route('/api/status-pages', statusPagesRoute);
app.route('/api/keys', apiKeysRoute);

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/status/:slug', async (c) => {
  return c.env.ASSETS.fetch(new Request(new URL('/', c.req.url)));
});

app.notFound(async (c) => {
  const url = new URL(c.req.url);
  
  if (url.pathname.startsWith('/api/')) {
    return c.json({ error: 'Not found' }, 404);
  }
  
  return c.env.ASSETS.fetch(new Request(new URL('/', c.req.url)));
});

export default {
  fetch: app.fetch,
  
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(env));
  },
};
