-- Development convenience migration:
-- Makes created_by nullable on write tables so the app works before an
-- auth/login flow is implemented.  Tighten to NOT NULL once auth is added.

ALTER TABLE tasks          ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE content_drafts ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE invoices       ALTER COLUMN created_by DROP NOT NULL;

-- Allow all authenticated users AND the service role to insert tasks freely
-- (the service role already bypasses RLS; this covers logged-in users too)
DROP POLICY IF EXISTS "Users can create tasks"       ON tasks;
DROP POLICY IF EXISTS "Users can create content drafts" ON content_drafts;
DROP POLICY IF EXISTS "Users can create invoices"    ON invoices;

CREATE POLICY "Authenticated users can create tasks"
  ON tasks FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Authenticated users can create content drafts"
  ON content_drafts FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Authenticated users can create invoices"
  ON invoices FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Also allow anonymous users to READ tasks/drafts/invoices for the dashboard
DROP POLICY IF EXISTS "Tasks viewable by authenticated users"          ON tasks;
DROP POLICY IF EXISTS "Content drafts viewable by authenticated users" ON content_drafts;
DROP POLICY IF EXISTS "Invoices viewable by authenticated users"       ON invoices;

CREATE POLICY "Tasks are publicly viewable"
  ON tasks          FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Content drafts are publicly viewable"
  ON content_drafts FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Invoices are publicly viewable"
  ON invoices       FOR SELECT TO authenticated, anon USING (true);

-- Allow updates too (needed for task status changes)
DROP POLICY IF EXISTS "Users can update assigned or own tasks" ON tasks;

CREATE POLICY "Tasks can be updated by anyone for now"
  ON tasks FOR UPDATE TO authenticated, anon USING (true);
