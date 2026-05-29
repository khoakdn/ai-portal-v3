-- AI Portal — Supabase Database Schema
-- Run this in the Supabase SQL Editor or via migration

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE task_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'rejected'
);

CREATE TYPE task_type AS ENUM (
  'content_draft',
  'invoice'
);

CREATE TYPE content_type AS ENUM (
  'press_release',
  'social_post'
);

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'manager', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- ---------------------------------------------------------------------------
-- Tasks (central workflow entity)
-- ---------------------------------------------------------------------------
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  type            task_type NOT NULL,
  status          task_status NOT NULL DEFAULT 'draft',
  created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assignee_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content_draft_id UUID,
  invoice_id      UUID,
  submitted_at    TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_type ON tasks(type);

-- ---------------------------------------------------------------------------
-- Content Drafts (AI-generated marketing content)
-- ---------------------------------------------------------------------------
CREATE TABLE content_drafts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            content_type NOT NULL,
  title           TEXT NOT NULL,
  bullet_points   TEXT NOT NULL,
  generated_body  TEXT NOT NULL DEFAULT '',
  edited_body     TEXT,
  ai_model        TEXT DEFAULT 'gemini-2.0-flash',
  created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_drafts_type ON content_drafts(type);
CREATE INDEX idx_content_drafts_created_by ON content_drafts(created_by);

-- ---------------------------------------------------------------------------
-- Invoices (extracted from uploaded documents)
-- ---------------------------------------------------------------------------
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_mime_type  TEXT NOT NULL,
  vendor          TEXT,
  total_amount    NUMERIC(12, 2),
  currency        TEXT DEFAULT 'USD',
  due_date        DATE,
  invoice_number  TEXT,
  extracted_raw   JSONB,
  ai_model        TEXT DEFAULT 'gemini-1.5-pro',
  created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_vendor ON invoices(vendor);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);

-- ---------------------------------------------------------------------------
-- Invoice Line Items
-- ---------------------------------------------------------------------------
CREATE TABLE invoice_line_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  quantity        NUMERIC(10, 2) DEFAULT 1,
  unit_price      NUMERIC(12, 2),
  amount          NUMERIC(12, 2) NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

-- ---------------------------------------------------------------------------
-- Foreign keys on tasks (deferred to avoid circular deps)
-- ---------------------------------------------------------------------------
ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_content_draft
  FOREIGN KEY (content_draft_id) REFERENCES content_drafts(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_invoice
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER content_drafts_updated_at
  BEFORE UPDATE ON content_drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all team profiles, update own
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Tasks: team members can view all, create own, managers can update any
CREATE POLICY "Tasks viewable by authenticated users"
  ON tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update assigned or own tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = assignee_id OR auth.uid() = reviewed_by);

-- Content drafts
CREATE POLICY "Content drafts viewable by authenticated users"
  ON content_drafts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create content drafts"
  ON content_drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own content drafts"
  ON content_drafts FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Invoices
CREATE POLICY "Invoices viewable by authenticated users"
  ON invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create invoices"
  ON invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Invoice line items (via invoice ownership)
CREATE POLICY "Line items viewable by authenticated users"
  ON invoice_line_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage line items for own invoices"
  ON invoice_line_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
        AND invoices.created_by = auth.uid()
    )
  );
