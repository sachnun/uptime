import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth, monitorsRoute, heartbeatsRoute, notificationsRoute, statusPagesRoute, apiKeysRoute } from './routes';
import { handleScheduled } from './cron';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());

app.use('*', async (c, next) => {
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://i.ibb.co https://*.cloudinary.com; font-src 'self' data:; connect-src 'self' https://api.github.com https://oauth2.googleapis.com https://*.googleusercontent.com; frame-ancestors 'none';");
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  await next();
});

app.use('/api/*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Cookie'],
  credentials: true,
}));

app.route('/api/auth', auth);
app.route('/api/monitors', monitorsRoute);
app.route('/api/heartbeats', heartbeatsRoute);
app.route('/api/notifications', notificationsRoute);
app.route('/api/status-pages', statusPagesRoute);
app.route('/api/keys', apiKeysRoute);

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/openapi.json', (c) => {
  const baseUrl = new URL(c.req.url).origin;
  
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Uptime API',
      description: 'REST API for uptime monitoring service',
      version: '1.0.0',
    },
    servers: [{ url: `${baseUrl}/api`, description: 'Current server' }],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key authentication',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from OAuth login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        Monitor: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['http', 'https', 'tcp', 'dns'] },
            url: { type: 'string', nullable: true },
            hostname: { type: 'string', nullable: true },
            port: { type: 'integer', nullable: true },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'] },
            expectedStatus: { type: 'integer' },
            expectedBody: { type: 'string', nullable: true },
            headers: { type: 'object', additionalProperties: { type: 'string' }, nullable: true },
            dnsRecordType: { type: 'string', enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'], nullable: true },
            interval: { type: 'integer' },
            timeout: { type: 'integer' },
            retries: { type: 'integer' },
            active: { type: 'boolean' },
            maintenanceStart: { type: 'string', format: 'date-time', nullable: true },
            maintenanceEnd: { type: 'string', format: 'date-time', nullable: true },
            screenshot: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateMonitor: {
          type: 'object',
          required: ['type'],
          properties: {
            name: { type: 'string', maxLength: 100 },
            type: { type: 'string', enum: ['http', 'https', 'tcp', 'dns'] },
            url: { type: 'string', format: 'uri' },
            hostname: { type: 'string' },
            port: { type: 'integer', minimum: 1, maximum: 65535 },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'], default: 'GET' },
            expectedStatus: { type: 'integer', minimum: 100, maximum: 599, default: 200 },
            expectedBody: { type: 'string', maxLength: 500 },
            headers: { type: 'object', additionalProperties: { type: 'string' } },
            dnsRecordType: { type: 'string', enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'] },
            interval: { type: 'integer', minimum: 60, maximum: 86400, default: 60 },
            timeout: { type: 'integer', minimum: 1, maximum: 120, default: 30 },
            retries: { type: 'integer', minimum: 0, maximum: 5, default: 0 },
            active: { type: 'boolean', default: true },
            maintenanceStart: { type: 'string', format: 'date-time' },
            maintenanceEnd: { type: 'string', format: 'date-time' },
            notificationIds: { type: 'array', items: { type: 'integer' } },
          },
        },
        Heartbeat: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            monitorId: { type: 'integer' },
            status: { type: 'boolean' },
            statusCode: { type: 'integer', nullable: true },
            responseTime: { type: 'integer', nullable: true },
            message: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['email', 'webhook'] },
            config: { type: 'object', additionalProperties: { type: 'string' } },
            active: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateNotification: {
          type: 'object',
          required: ['name', 'type', 'config'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            type: { type: 'string', enum: ['email', 'webhook'] },
            config: { type: 'object', additionalProperties: { type: 'string' } },
            active: { type: 'boolean', default: true },
          },
        },
        StatusPage: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            slug: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            theme: { type: 'string', enum: ['light', 'dark', 'auto'] },
            published: { type: 'boolean' },
            monitorIds: { type: 'array', items: { type: 'integer' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateStatusPage: {
          type: 'object',
          required: ['slug', 'title'],
          properties: {
            slug: { type: 'string', pattern: '^[a-z0-9-]+$', minLength: 1, maxLength: 50 },
            title: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            theme: { type: 'string', enum: ['light', 'dark', 'auto'], default: 'light' },
            published: { type: 'boolean', default: false },
            monitorIds: { type: 'array', items: { type: 'integer' } },
          },
        },

      },
    },
    security: [{ apiKey: [] }, { bearerAuth: [] }],
    paths: {
      '/monitors': {
        get: {
          tags: ['Monitors'],
          summary: 'List all monitors',
          responses: {
            '200': { description: 'List of monitors', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Monitor' } } } } },
          },
        },
        post: {
          tags: ['Monitors'],
          summary: 'Create new monitor',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMonitor' } } } },
          responses: {
            '201': { description: 'Created monitor', content: { 'application/json': { schema: { $ref: '#/components/schemas/Monitor' } } } },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/monitors/{id}': {
        get: {
          tags: ['Monitors'],
          summary: 'Get monitor details',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Monitor details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Monitor' } } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        put: {
          tags: ['Monitors'],
          summary: 'Update monitor',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMonitor' } } } },
          responses: {
            '200': { description: 'Updated monitor', content: { 'application/json': { schema: { $ref: '#/components/schemas/Monitor' } } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        delete: {
          tags: ['Monitors'],
          summary: 'Delete monitor',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/monitors/{id}/pause': {
        post: {
          tags: ['Monitors'],
          summary: 'Pause monitoring',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Success' }, '404': { description: 'Not found' } },
        },
      },
      '/monitors/{id}/resume': {
        post: {
          tags: ['Monitors'],
          summary: 'Resume monitoring',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Success' }, '404': { description: 'Not found' } },
        },
      },
      '/monitors/test': {
        post: {
          tags: ['Monitors'],
          summary: 'Test monitor configuration',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMonitor' } } } },
          responses: {
            '200': { description: 'Test result', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, statusCode: { type: 'integer' }, responseTime: { type: 'integer' }, message: { type: 'string' } } } } } },
          },
        },
      },
      '/heartbeats/{monitorId}': {
        get: {
          tags: ['Heartbeats'],
          summary: 'Get heartbeats for a monitor',
          parameters: [
            { name: 'monitorId', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'hours', in: 'query', schema: { type: 'integer', default: 24 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
          ],
          responses: { '200': { description: 'List of heartbeats', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Heartbeat' } } } } } },
        },
      },
      '/heartbeats/{monitorId}/stats': {
        get: {
          tags: ['Heartbeats'],
          summary: 'Get uptime statistics',
          parameters: [{ name: 'monitorId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Uptime stats', content: { 'application/json': { schema: { type: 'object', properties: { last24h: { type: 'object' }, last7d: { type: 'object' }, last30d: { type: 'object' } } } } } },
          },
        },
      },
      '/heartbeats/{monitorId}/incidents': {
        get: {
          tags: ['Heartbeats'],
          summary: 'List incidents',
          parameters: [{ name: 'monitorId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'List of incidents' } },
        },
      },
      '/heartbeats/{monitorId}/hourly': {
        get: {
          tags: ['Heartbeats'],
          summary: 'Get hourly statistics',
          parameters: [
            { name: 'monitorId', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'days', in: 'query', schema: { type: 'integer', default: 7 } },
          ],
          responses: { '200': { description: 'Hourly stats' } },
        },
      },
      '/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'List notification channels',
          responses: { '200': { description: 'List of notifications', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } } } },
        },
        post: {
          tags: ['Notifications'],
          summary: 'Create notification channel',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateNotification' } } } },
          responses: { '201': { description: 'Created notification', content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } } } },
        },
      },
      '/notifications/{id}': {
        get: {
          tags: ['Notifications'],
          summary: 'Get notification details',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Notification details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } } } },
        },
        put: {
          tags: ['Notifications'],
          summary: 'Update notification',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateNotification' } } } },
          responses: { '200': { description: 'Updated notification' } },
        },
        delete: {
          tags: ['Notifications'],
          summary: 'Delete notification',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Success' } },
        },
      },
      '/notifications/{id}/test': {
        post: {
          tags: ['Notifications'],
          summary: 'Send test notification',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Test sent' }, '500': { description: 'Failed to send' } },
        },
      },
      '/status-pages': {
        get: {
          tags: ['Status Pages'],
          summary: 'List status pages',
          responses: { '200': { description: 'List of status pages', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/StatusPage' } } } } } },
        },
        post: {
          tags: ['Status Pages'],
          summary: 'Create status page',
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateStatusPage' } } } },
          responses: { '201': { description: 'Created status page', content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusPage' } } } } },
        },
      },
      '/status-pages/public/{slug}': {
        get: {
          tags: ['Status Pages'],
          summary: 'Get public status page',
          security: [],
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Public status page with monitors' }, '404': { description: 'Not found' } },
        },
      },
      '/status-pages/{id}': {
        get: {
          tags: ['Status Pages'],
          summary: 'Get status page details',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Status page details', content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusPage' } } } } },
        },
        put: {
          tags: ['Status Pages'],
          summary: 'Update status page',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateStatusPage' } } } },
          responses: { '200': { description: 'Updated status page' } },
        },
        delete: {
          tags: ['Status Pages'],
          summary: 'Delete status page',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Success' } },
        },
      },
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          security: [],
          responses: { '200': { description: 'Service healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' } } } } } } },
        },
      },
    },
  };

  return c.json(spec);
});

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
