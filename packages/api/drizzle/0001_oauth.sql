DROP TABLE IF EXISTS `users`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `email` text NOT NULL,
  `name` text,
  `avatar` text,
  `provider` text NOT NULL,
  `provider_id` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);
CREATE UNIQUE INDEX IF NOT EXISTS `users_provider_id_unique` ON `users` (`provider`, `provider_id`);
