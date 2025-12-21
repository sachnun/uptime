-- Add response body validation field to monitors
ALTER TABLE monitors ADD COLUMN expected_body TEXT;

-- Add maintenance window fields to monitors
ALTER TABLE monitors ADD COLUMN maintenance_start INTEGER;
ALTER TABLE monitors ADD COLUMN maintenance_end INTEGER;

-- Create incidents table for tracking downtime history
CREATE TABLE incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER,
  duration INTEGER,
  cause TEXT
);

CREATE INDEX idx_incidents_monitor_id ON incidents(monitor_id);
CREATE INDEX idx_incidents_started_at ON incidents(started_at);

-- Create hourly_stats table for pre-computed aggregates
CREATE TABLE hourly_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  hour INTEGER NOT NULL,
  avg_response_time INTEGER,
  min_response_time INTEGER,
  max_response_time INTEGER,
  uptime_percentage REAL,
  check_count INTEGER NOT NULL DEFAULT 0,
  up_count INTEGER NOT NULL DEFAULT 0,
  down_count INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_hourly_stats_monitor_hour ON hourly_stats(monitor_id, hour);
