CREATE TABLE IF NOT EXISTS `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `username` text NOT NULL,
  `password_hash` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS `users_username_unique` ON `users` (`username`);

CREATE TABLE IF NOT EXISTS `monitors` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `url` text,
  `hostname` text,
  `port` integer,
  `method` text DEFAULT 'GET',
  `expected_status` integer DEFAULT 200,
  `dns_record_type` text,
  `interval` integer NOT NULL DEFAULT 60,
  `timeout` integer NOT NULL DEFAULT 30,
  `retries` integer NOT NULL DEFAULT 0,
  `active` integer NOT NULL DEFAULT true,
  `created_at` integer DEFAULT (unixepoch()),
  `updated_at` integer DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS `heartbeats` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `monitor_id` integer NOT NULL,
  `status` integer NOT NULL,
  `status_code` integer,
  `response_time` integer,
  `message` text,
  `created_at` integer DEFAULT (unixepoch()),
  FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `heartbeats_monitor_id_idx` ON `heartbeats` (`monitor_id`);
CREATE INDEX IF NOT EXISTS `heartbeats_created_at_idx` ON `heartbeats` (`created_at`);

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `config` text,
  `active` integer NOT NULL DEFAULT true,
  `created_at` integer DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS `monitor_notifications` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `monitor_id` integer NOT NULL,
  `notification_id` integer NOT NULL,
  FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `status_pages` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `slug` text NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `theme` text DEFAULT 'light',
  `published` integer NOT NULL DEFAULT false,
  `created_at` integer DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS `status_pages_slug_unique` ON `status_pages` (`slug`);

CREATE TABLE IF NOT EXISTS `status_page_monitors` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `status_page_id` integer NOT NULL,
  `monitor_id` integer NOT NULL,
  `order` integer NOT NULL DEFAULT 0,
  FOREIGN KEY (`status_page_id`) REFERENCES `status_pages`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON DELETE CASCADE
);
