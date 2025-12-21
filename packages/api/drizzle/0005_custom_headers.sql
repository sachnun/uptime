-- Add custom headers field to monitors for HTTP requests
ALTER TABLE monitors ADD COLUMN headers TEXT;
