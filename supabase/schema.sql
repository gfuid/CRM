-- ============================================================
-- OneRoot-Style SaaS CRM — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. Companies (Multi-tenant root)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  max_staff INT DEFAULT 3,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','staff')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country TEXT DEFAULT 'Not specified',
  product TEXT,
  industry TEXT DEFAULT 'Export' CHECK (industry IN ('Export','Domestic')),
  quantity INT DEFAULT 0,
  price DECIMAL(12,2) DEFAULT 0,
  responsible_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  follow_up_date DATE,
  status TEXT DEFAULT 'Lead Generation' CHECK (status IN (
    'Lead Generation','Contact Established','Requirement Understood',
    'Quotation Sent','Closed Won','Closed Lost'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('High','Medium','Low')),
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Completed')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Outreach Logs (daily employee activity matrix)
CREATE TABLE IF NOT EXISTS outreach_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  new_leads INT DEFAULT 0,
  calls_initiated INT DEFAULT 0,
  emails_sent INT DEFAULT 0,
  whatsapp_sent INT DEFAULT 0,
  responses INT DEFAULT 0,
  meetings INT DEFAULT 0,
  price_discussions INT DEFAULT 0,
  payment_discussions INT DEFAULT 0,
  sample_discussions INT DEFAULT 0,
  samples_sent INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- 6. Follow-ups
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  follow_up_date DATE NOT NULL,
  notes TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  products TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(company_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_responsible ON leads(responsible_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_outreach_user_date ON outreach_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_followups_user ON follow_ups(user_id, follow_up_date);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- COMPANIES: users can only see their own company
CREATE POLICY "Users view own company" ON companies
  FOR SELECT USING (id = get_my_company_id());

-- PROFILES: users see all profiles in their company
CREATE POLICY "View company profiles" ON profiles
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- LEADS: company-level read, owner can write all, staff can update assigned
CREATE POLICY "View company leads" ON leads
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Owner insert leads" ON leads
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Owner update leads" ON leads
  FOR UPDATE USING (company_id = get_my_company_id());

CREATE POLICY "Owner delete leads" ON leads
  FOR DELETE USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'owner'
  );

-- TASKS: company-level read, owner manages all
CREATE POLICY "View company tasks" ON tasks
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Insert company tasks" ON tasks
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Update company tasks" ON tasks
  FOR UPDATE USING (company_id = get_my_company_id());

CREATE POLICY "Owner delete tasks" ON tasks
  FOR DELETE USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'owner'
  );

-- OUTREACH_LOGS: company read, own write
CREATE POLICY "View company outreach" ON outreach_logs
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Insert own outreach" ON outreach_logs
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "Update own outreach" ON outreach_logs
  FOR UPDATE USING (
    company_id = get_my_company_id()
    AND (user_id = auth.uid() OR get_my_role() = 'owner')
  );

-- FOLLOW_UPS: company read, own write
CREATE POLICY "View company followups" ON follow_ups
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Insert company followups" ON follow_ups
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Update company followups" ON follow_ups
  FOR UPDATE USING (company_id = get_my_company_id());

CREATE POLICY "Delete company followups" ON follow_ups
  FOR DELETE USING (company_id = get_my_company_id());

-- SUPPLIERS: company-level access
CREATE POLICY "View company suppliers" ON suppliers
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "Insert company suppliers" ON suppliers
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Update company suppliers" ON suppliers
  FOR UPDATE USING (company_id = get_my_company_id());

CREATE POLICY "Delete company suppliers" ON suppliers
  FOR DELETE USING (
    company_id = get_my_company_id()
    AND get_my_role() = 'owner'
  );

-- ============================================================
-- AUTO-UPDATE updated_at on leads
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
