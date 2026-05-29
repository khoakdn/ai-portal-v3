-- Integration Settings Table
-- Allows admins to configure webhooks and toggle notifications via the UI
-- rather than relying solely on environment variables.

CREATE TABLE integration_settings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration         TEXT NOT NULL UNIQUE CHECK (integration IN ('teams', 'basecamp')),
  enabled             BOOLEAN NOT NULL DEFAULT false,
  webhook_url         TEXT,                          -- overrides env var when set
  notify_on_approved  BOOLEAN NOT NULL DEFAULT true,
  notify_on_rejected  BOOLEAN NOT NULL DEFAULT true,
  notify_on_pending   BOOLEAN NOT NULL DEFAULT false,
  updated_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed both integrations as disabled by default
INSERT INTO integration_settings (integration, enabled) VALUES
  ('teams',    false),
  ('basecamp', false);

-- Trigger to keep updated_at current
CREATE TRIGGER integration_settings_updated_at
  BEFORE UPDATE ON integration_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (so the UI can show status)
CREATE POLICY "Integration settings viewable by authenticated users"
  ON integration_settings FOR SELECT TO authenticated USING (true);

-- Only admins/managers can update
CREATE POLICY "Only managers can update integration settings"
  ON integration_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('manager', 'admin')
    )
  );
