-- =========================================================================
-- GuardAgent: Supabase PostgreSQL Database Schema
-- AI Agent Security Platform (Beta)
-- =========================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'security_engineer',
  organization TEXT DEFAULT 'GuardAgent Org',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AI Agents Table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id TEXT UNIQUE NOT NULL, -- e.g. "agt-customer-support-01"
  name TEXT NOT NULL,
  description TEXT,
  environment TEXT DEFAULT 'production', -- 'development', 'staging', 'production'
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'revoked'
  api_key_hash TEXT NOT NULL, -- Hashed API secret for agent authentication
  assigned_policies JSONB DEFAULT '[]'::jsonb,
  total_requests INTEGER DEFAULT 0,
  blocked_requests INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Security Policies Table
CREATE TABLE IF NOT EXISTS public.security_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_id TEXT UNIQUE NOT NULL, -- e.g. "pol-p01-pii-masking"
  name TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'HIGH', -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
  status TEXT DEFAULT 'active', -- 'active', 'disabled'
  target_tool TEXT NOT NULL, -- Tool or scope e.g. 'db_read_query', 'all', 'send_email'
  allowed_actions JSONB DEFAULT '[]'::jsonb,
  prohibited_actions JSONB DEFAULT '[]'::jsonb,
  risk_threshold INTEGER DEFAULT 75, -- 0-100 score threshold triggering BLOCK or APPROVAL
  enforcement_action TEXT DEFAULT 'REQUIRE_APPROVAL', -- 'BLOCK', 'REQUIRE_APPROVAL', 'ALERT'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Action Requests Table
CREATE TABLE IF NOT EXISTS public.action_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id TEXT UNIQUE NOT NULL, -- e.g. "req-89102-xaf"
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  action_name TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  decision TEXT NOT NULL, -- 'ALLOW', 'BLOCK', 'REQUIRE_APPROVAL'
  risk_score INTEGER NOT NULL, -- 0-100
  risk_level TEXT NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  rationale TEXT NOT NULL,
  triggered_policies JSONB DEFAULT '[]'::jsonb,
  execution_status TEXT DEFAULT 'PENDING', -- 'EXECUTED', 'BLOCKED', 'AWAITING_APPROVAL', 'FAILED'
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Approval Requests Table (Human-in-the-loop)
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id TEXT UNIQUE NOT NULL, -- e.g. "apr-3921-99"
  request_id TEXT REFERENCES public.action_requests(request_id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  action_summary TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Audit Logs Table (Immutable security ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id TEXT UNIQUE NOT NULL,
  correlation_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_type TEXT NOT NULL, -- 'AGENT', 'USER', 'SYSTEM', 'SECURITY_ENGINE'
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'POLICY_EVALUATION', 'ACTION_EXECUTION', 'APPROVAL_GRANTED', 'ACTION_BLOCKED'
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  decision TEXT,
  risk_score INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. Security Alerts Table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id TEXT UNIQUE NOT NULL,
  severity TEXT NOT NULL, -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  agent_id TEXT,
  agent_name TEXT,
  status TEXT DEFAULT 'OPEN', -- 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_action_requests_agent ON public.action_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_action_requests_decision ON public.action_requests(decision);
CREATE INDEX IF NOT EXISTS idx_approval_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON public.audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);

-- =========================================================================
-- Row Level Security (RLS) Configuration
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: users can read/update their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Agents: users manage their own agents
CREATE POLICY "Users can view own agents"
  ON public.agents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agents"
  ON public.agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agents"
  ON public.agents FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Security Policies: users view and edit their policies
CREATE POLICY "Users can view own policies"
  ON public.security_policies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert policies"
  ON public.security_policies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update policies"
  ON public.security_policies FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Audit Logs: Read-only for authorized users, non-modifiable
CREATE POLICY "Users can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Disallow client direct inserts/updates/deletions on audit logs (Server role only)
