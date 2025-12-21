-- Add user_id column to monitors
ALTER TABLE monitors ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id column to notifications
ALTER TABLE notifications ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id column to status_pages
ALTER TABLE status_pages ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX idx_monitors_user_id ON monitors(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_status_pages_user_id ON status_pages(user_id);
