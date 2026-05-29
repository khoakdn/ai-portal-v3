-- ── Migration 004: Iterative review workflow ─────────────────────────────
-- Adds: needs_revisions status, version tracking, task_activity audit log

-- 1. Extend the task_status enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'needs_revisions';

-- 2. Add version column to tasks (defaults to 1 for all existing rows)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 3. Create the task_activity audit log
CREATE TABLE IF NOT EXISTS task_activity (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id          UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action           TEXT        NOT NULL CHECK (
                     action IN (
                       'draft_saved',
                       'submitted',
                       'approved',
                       'rejected',
                       'changes_requested',
                       'resubmitted'
                     )
                   ),
  feedback_text    TEXT,                        -- reviewer's written feedback
  snapshot_content TEXT,                        -- full document text at this point in time
  actor_name       TEXT,                        -- display name of the person who took the action
  version          INTEGER     NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id
  ON task_activity (task_id, created_at DESC);

-- 4. RLS (open policies to match the dev-mode migration 003 pattern)
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task activity viewable by all"
  ON task_activity FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Task activity insertable by all"
  ON task_activity FOR INSERT TO authenticated, anon WITH CHECK (true);
