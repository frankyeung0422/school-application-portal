-- Add application_info column to application_tracking table
-- Run this in your Supabase SQL Editor

-- Add the application_info column to store JSON data about application status
ALTER TABLE application_tracking 
ADD COLUMN application_info JSONB;

-- Add a comment to describe the column
COMMENT ON COLUMN application_tracking.application_info IS 'JSON data containing application status information including status, deadline, start_date, etc.';

-- Update existing rows to have a default value
UPDATE application_tracking 
SET application_info = '{}'::jsonb 
WHERE application_info IS NULL;

-- Make the column NOT NULL with a default value
ALTER TABLE application_tracking 
ALTER COLUMN application_info SET NOT NULL,
ALTER COLUMN application_info SET DEFAULT '{}'::jsonb; 