-- ==============================================================
-- WeFlow V5 — Supabase Postgres Schema (IDEMPOTENT)
-- PRD § 9 — All tables with RLS enabled, realtime on key tables
-- ==============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================
-- 0. RLS HELPER FUNCTION
-- ==============================================================
-- This function runs as the table owner (bypassing RLS) to prevent 
-- infinite recursion when workspaces point to users and users point to workspaces.
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE workspace_id = ws_id AND account_id = auth.uid()
  );
$$;

-- ==============================================================
-- 1. WORKSPACES
-- ==============================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  logo_url            TEXT,
  brand_color         TEXT DEFAULT '#F36B21',
  founding_creator_id UUID NOT NULL,  -- references auth.users.id
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspaces: select member workspaces" ON workspaces;
CREATE POLICY "Workspaces: select member workspaces" ON workspaces
  FOR SELECT USING (
    is_workspace_member(id)
    OR founding_creator_id = auth.uid()
  );

DROP POLICY IF EXISTS "Workspaces: insert anyone" ON workspaces;
CREATE POLICY "Workspaces: insert anyone" ON workspaces
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Workspaces: update by founding creator" ON workspaces;
CREATE POLICY "Workspaces: update by founding creator" ON workspaces
  FOR UPDATE USING (founding_creator_id = auth.uid());

-- ==============================================================
-- 2. USERS (workspace members)
-- ==============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id    UUID NOT NULL,  -- references auth.users.id
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('creator', 'co-creator', 'observer')),
  member_color  TEXT DEFAULT '#888888',
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users: select own workspace" ON users;
CREATE POLICY "Users: select own workspace" ON users
  FOR SELECT USING (
    account_id = auth.uid()
    OR
    is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Users: insert by creator" ON users;
CREATE POLICY "Users: insert by creator" ON users
  FOR INSERT WITH CHECK (
    account_id = auth.uid() -- allow self-insert on onboarding
    OR
    (is_workspace_member(workspace_id) AND (
      SELECT role FROM users WHERE account_id = auth.uid() AND workspace_id = workspace_id LIMIT 1
    ) = 'creator')
  );

-- ==============================================================
-- 3. INVITE LINKS
-- ==============================================================
CREATE TABLE IF NOT EXISTS invite_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('creator', 'co-creator', 'observer')),
  token         UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invite links: read by workspace members" ON invite_links;
CREATE POLICY "Invite links: read by workspace members" ON invite_links
  FOR SELECT USING (
    is_workspace_member(workspace_id)
    OR is_active = TRUE  -- public read for join page validation
  );

DROP POLICY IF EXISTS "Invite links: manage by creators" ON invite_links;
CREATE POLICY "Invite links: manage by creators" ON invite_links
  FOR ALL USING (
    is_workspace_member(workspace_id) AND (
      SELECT role FROM users WHERE account_id = auth.uid() AND workspace_id = workspace_id LIMIT 1
    ) = 'creator'
  );

-- ==============================================================
-- 4. PENDING MEMBERS (join requests)
-- ==============================================================
CREATE TABLE IF NOT EXISTS pending_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('creator', 'co-creator', 'observer')),
  token_used    UUID REFERENCES invite_links(token),
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  reviewed_by   UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pending_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pending: anyone can insert" ON pending_members;
CREATE POLICY "Pending: anyone can insert" ON pending_members
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Pending: creators can read and update" ON pending_members;
CREATE POLICY "Pending: creators can read and update" ON pending_members
  FOR ALL USING (
    is_workspace_member(workspace_id) AND (
      SELECT role FROM users WHERE account_id = auth.uid() AND workspace_id = workspace_id LIMIT 1
    ) = 'creator'
  );

-- ==============================================================
-- 5. TASKS
-- ==============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title            TEXT NOT NULL CHECK (char_length(title) <= 200),
  category         TEXT CHECK (category IN ('Product', 'Tech', 'Design', 'Marketing', 'Ops', 'Finance')),
  status_col       TEXT NOT NULL DEFAULT 'todo' CHECK (status_col IN ('todo', 'doing', 'done', 'blocked')),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected', 'done')),
  assigned_to      UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date         DATE,
  is_urgent        BOOLEAN DEFAULT FALSE,
  blocker_note     TEXT,
  rejection_reason TEXT,
  submitted_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks: select by workspace members" ON tasks;
CREATE POLICY "Tasks: select by workspace members" ON tasks
  FOR SELECT USING (
    is_workspace_member(workspace_id)
    AND (
      status IN ('active', 'done', 'rejected')
      OR (status = 'pending' AND (
        SELECT role FROM users WHERE account_id = auth.uid() AND workspace_id = workspace_id LIMIT 1
      ) = 'creator')
    )
  );

DROP POLICY IF EXISTS "Tasks: insert by members" ON tasks;
CREATE POLICY "Tasks: insert by members" ON tasks
  FOR INSERT WITH CHECK (
    is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Tasks: update by creator" ON tasks;
CREATE POLICY "Tasks: update by creator" ON tasks
  FOR UPDATE USING (
    is_workspace_member(workspace_id) AND (
      SELECT role FROM users WHERE account_id = auth.uid() AND workspace_id = workspace_id LIMIT 1
    ) = 'creator'
  );

DROP POLICY IF EXISTS "Tasks: co-creator update own pending" ON tasks;
CREATE POLICY "Tasks: co-creator update own pending" ON tasks
  FOR UPDATE USING (
    submitted_by IN (
      SELECT id FROM users WHERE account_id = auth.uid()
    )
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Tasks: delete by creator" ON tasks;
CREATE POLICY "Tasks: delete by creator" ON tasks
  FOR DELETE USING (
    is_workspace_member(workspace_id) AND (
      SELECT role FROM users WHERE account_id = auth.uid() AND workspace_id = workspace_id LIMIT 1
    ) = 'creator'
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==============================================================
-- 6. MILESTONES
-- ==============================================================
CREATE TABLE IF NOT EXISTS milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  target_date   DATE,
  is_complete   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Milestones: all workspace members" ON milestones;
CREATE POLICY "Milestones: all workspace members" ON milestones
  FOR SELECT USING (
    is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Milestones: creators manage" ON milestones;
CREATE POLICY "Milestones: creators manage" ON milestones
  FOR ALL USING (
    is_workspace_member(workspace_id) AND (
      SELECT role FROM users WHERE account_id = auth.uid() AND workspace_id = workspace_id LIMIT 1
    ) = 'creator'
  );

-- ==============================================================
-- 7. SETTINGS (sprint config per workspace)
-- ==============================================================
CREATE TABLE IF NOT EXISTS settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  sprint_name       TEXT DEFAULT 'Sprint 1',
  sprint_start      DATE,
  sprint_end        DATE,
  north_star        TEXT CHECK (char_length(north_star) <= 120),
  monday_sync_notes JSONB,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings: all workspace members read" ON settings;
CREATE POLICY "Settings: all workspace members read" ON settings
  FOR SELECT USING (
    is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Settings: creators update" ON settings;
CREATE POLICY "Settings: creators update" ON settings
  FOR UPDATE USING (
    is_workspace_member(workspace_id) AND (
      SELECT role FROM users WHERE account_id = auth.uid() AND workspace_id = workspace_id LIMIT 1
    ) = 'creator'
  );

DROP POLICY IF EXISTS "Settings: insert on onboarding" ON settings;
CREATE POLICY "Settings: insert on onboarding" ON settings
  FOR INSERT WITH CHECK (true);

-- ==============================================================
-- 8. REALTIME — Enable on key tables per PRD § 7.1
-- ==============================================================
-- Run these in the Supabase Dashboard → Database → Replication
-- ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
-- ALTER PUBLICATION supabase_realtime ADD TABLE users;
-- ALTER PUBLICATION supabase_realtime ADD TABLE pending_members;
-- ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- ==============================================================
-- 9. STORAGE BUCKET (for workspace logos)
-- ==============================================================
-- Create in Supabase Dashboard → Storage → New Bucket
-- Bucket name: workspace-assets
-- Public: true
-- Max file size: 2MB
-- Allowed MIME types: image/*
