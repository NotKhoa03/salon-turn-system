-- Add color column to services for grid display customization
ALTER TABLE services ADD COLUMN color TEXT DEFAULT 'green';

COMMENT ON COLUMN services.color IS 'Color theme for displaying this service in the turn grid. Options: green, blue, purple, pink, orange, red, yellow, teal';
