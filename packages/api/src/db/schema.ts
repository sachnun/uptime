import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const monitors = sqliteTable('monitors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['http', 'https', 'tcp', 'dns'] }).notNull(),
  url: text('url'),
  hostname: text('hostname'),
  port: integer('port'),
  method: text('method').default('GET'),
  expectedStatus: integer('expected_status').default(200),
  dnsRecordType: text('dns_record_type'),
  interval: integer('interval').notNull().default(60),
  timeout: integer('timeout').notNull().default(30),
  retries: integer('retries').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const heartbeats = sqliteTable('heartbeats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monitorId: integer('monitor_id').notNull().references(() => monitors.id, { onDelete: 'cascade' }),
  status: integer('status', { mode: 'boolean' }).notNull(),
  statusCode: integer('status_code'),
  responseTime: integer('response_time'),
  message: text('message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['webhook', 'discord', 'telegram', 'slack'] }).notNull(),
  config: text('config', { mode: 'json' }).$type<Record<string, string>>(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const monitorNotifications = sqliteTable('monitor_notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monitorId: integer('monitor_id').notNull().references(() => monitors.id, { onDelete: 'cascade' }),
  notificationId: integer('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
});

export const statusPages = sqliteTable('status_pages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  theme: text('theme').default('light'),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const statusPageMonitors = sqliteTable('status_page_monitors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  statusPageId: integer('status_page_id').notNull().references(() => statusPages.id, { onDelete: 'cascade' }),
  monitorId: integer('monitor_id').notNull().references(() => monitors.id, { onDelete: 'cascade' }),
  order: integer('order').notNull().default(0),
});
