-- Migration: convert alert_messages.content (text) to parts (jsonb)
-- Run this against the project_meta database for existing installations

\c project_meta

-- Add parts column alongside content so we can migrate data
ALTER TABLE project_meta.alert_messages
  ADD COLUMN IF NOT EXISTS parts jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Populate parts from existing content
UPDATE project_meta.alert_messages
SET parts = jsonb_build_array(jsonb_build_object('type', 'text', 'text', content))
WHERE content IS NOT NULL AND content != '';

-- Drop the old content column
ALTER TABLE project_meta.alert_messages
  DROP COLUMN IF EXISTS content;

\c postgres
