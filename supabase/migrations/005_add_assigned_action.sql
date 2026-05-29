-- ── Migration 005: add 'assigned' to task_activity action values ──────────────
-- PostgreSQL CHECK constraints cannot be altered in-place; we drop and recreate.

ALTER TABLE task_activity DROP CONSTRAINT IF EXISTS task_activity_action_check;

ALTER TABLE task_activity
  ADD CONSTRAINT task_activity_action_check
  CHECK (
    action IN (
      'draft_saved',
      'submitted',
      'approved',
      'rejected',
      'changes_requested',
      'resubmitted',
      'assigned'
    )
  );
