CREATE INDEX IF NOT EXISTS idx_heartbeats_monitor_created ON heartbeats(monitor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_monitor_resolved ON incidents(monitor_id, resolved_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_stats_monitor_hour ON hourly_stats(monitor_id, hour);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_monitors_user_active ON monitors(user_id, active);
