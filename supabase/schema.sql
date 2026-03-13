-- =============================================
-- QUEST MVP – Supabase Schema
-- Supabase SQL Editorに貼り付けて実行してください
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Users (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL CHECK (role IN ('student', 'expert', 'admin')) DEFAULT 'student',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Avatar migration (run if table already exists)
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Student profiles
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school  TEXT,
  grade   TEXT
);

-- Expert profiles
CREATE TABLE IF NOT EXISTS public.expert_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  real_name         TEXT NOT NULL DEFAULT '',
  affiliation       TEXT NOT NULL DEFAULT '',
  tags              TEXT[] DEFAULT '{}',
  facebook_url      TEXT NOT NULL DEFAULT '',
  slack_url         TEXT,
  bio               TEXT,
  weekly_commitment TEXT NOT NULL CHECK (weekly_commitment IN ('yes', 'maybe')) DEFAULT 'yes',
  profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Questions
CREATE TABLE IF NOT EXISTS public.questions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  background  TEXT NOT NULL DEFAULT '',
  hypothesis  TEXT NOT NULL DEFAULT '',
  stuck_point TEXT NOT NULL DEFAULT '',
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Availability slots
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_datetime   TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 20,
  status           TEXT NOT NULL CHECK (status IN ('free', 'booked')) DEFAULT 'free',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Requests
CREATE TABLE IF NOT EXISTS public.requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.users(id),
  expert_id   UUID NOT NULL REFERENCES public.users(id),
  slot_id     UUID NOT NULL REFERENCES public.availability_slots(id),
  status      TEXT NOT NULL CHECK (status IN ('pending','accepted','declined','cancelled')) DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id   UUID UNIQUE NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  status       TEXT NOT NULL CHECK (status IN ('scheduled','done')) DEFAULT 'scheduled',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Chat threads
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID UNIQUE REFERENCES public.requests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id),
  expert_id  UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id  UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES public.users(id),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Three-line logs
CREATE TABLE IF NOT EXISTS public.three_line_logs (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id               UUID UNIQUE NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  submitted_by_student_id  UUID NOT NULL REFERENCES public.users(id),
  reframe                  TEXT NOT NULL DEFAULT '',
  next_step_48h            TEXT NOT NULL DEFAULT '',
  referral_wish            TEXT,
  executed_48h             BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at             TIMESTAMPTZ,
  approved_by_expert_id    UUID REFERENCES public.users(id),
  approved_at              TIMESTAMPTZ,
  expert_comment           TEXT
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.three_line_logs ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- USERS
CREATE POLICY "users_read_own" ON public.users FOR SELECT USING (
  id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (
  id = auth.uid() OR public.current_user_role() = 'admin'
);

-- EXPERT PROFILES: public read (only completed), self write, admin all
CREATE POLICY "ep_read_completed" ON public.expert_profiles FOR SELECT USING (
  profile_completed = TRUE OR user_id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY "ep_insert_own" ON public.expert_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ep_update_own" ON public.expert_profiles FOR UPDATE USING (
  user_id = auth.uid() OR public.current_user_role() = 'admin'
);

-- STUDENT PROFILES
CREATE POLICY "sp_self_or_admin" ON public.student_profiles FOR ALL USING (
  user_id = auth.uid() OR public.current_user_role() = 'admin'
);

-- QUESTIONS: owner or admin read/write
CREATE POLICY "q_read" ON public.questions FOR SELECT USING (
  student_id = auth.uid() OR public.current_user_role() IN ('expert','admin')
);
CREATE POLICY "q_insert" ON public.questions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "q_update" ON public.questions FOR UPDATE USING (student_id = auth.uid());

-- AVAILABILITY SLOTS: expert own + students read free + admin all
CREATE POLICY "slot_read" ON public.availability_slots FOR SELECT USING (
  status = 'free' OR expert_id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY "slot_insert" ON public.availability_slots FOR INSERT WITH CHECK (
  expert_id = auth.uid() AND public.current_user_role() = 'expert'
);
CREATE POLICY "slot_update" ON public.availability_slots FOR UPDATE USING (
  expert_id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY "slot_delete" ON public.availability_slots FOR DELETE USING (
  expert_id = auth.uid()
);

-- REQUESTS: student or expert involved + admin
CREATE POLICY "req_read" ON public.requests FOR SELECT USING (
  student_id = auth.uid() OR expert_id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY "req_insert" ON public.requests FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "req_update" ON public.requests FOR UPDATE USING (
  student_id = auth.uid() OR expert_id = auth.uid() OR public.current_user_role() = 'admin'
);

-- SESSIONS
CREATE POLICY "sess_read" ON public.sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND (r.student_id = auth.uid() OR r.expert_id = auth.uid()))
  OR public.current_user_role() = 'admin'
);
CREATE POLICY "sess_insert" ON public.sessions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND (r.student_id = auth.uid() OR r.expert_id = auth.uid()))
  OR public.current_user_role() = 'admin'
);
CREATE POLICY "sess_update" ON public.sessions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND (r.student_id = auth.uid() OR r.expert_id = auth.uid()))
  OR public.current_user_role() = 'admin'
);

-- CHAT THREADS
CREATE POLICY "thread_read" ON public.chat_threads FOR SELECT USING (
  student_id = auth.uid() OR expert_id = auth.uid() OR public.current_user_role() = 'admin'
);
CREATE POLICY "thread_insert" ON public.chat_threads FOR INSERT WITH CHECK (
  student_id = auth.uid() OR public.current_user_role() = 'admin'
);

-- CHAT MESSAGES
CREATE POLICY "msg_read" ON public.chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND (t.student_id = auth.uid() OR t.expert_id = auth.uid()))
  OR public.current_user_role() = 'admin'
);
CREATE POLICY "msg_insert" ON public.chat_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND (t.student_id = auth.uid() OR t.expert_id = auth.uid()))
);

-- THREE LINE LOGS
CREATE POLICY "log_read" ON public.three_line_logs FOR SELECT USING (
  submitted_by_student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.sessions s JOIN public.requests r ON r.id = s.request_id WHERE s.id = session_id AND r.expert_id = auth.uid())
  OR public.current_user_role() = 'admin'
);
CREATE POLICY "log_insert" ON public.three_line_logs FOR INSERT WITH CHECK (
  submitted_by_student_id = auth.uid()
);
CREATE POLICY "log_update" ON public.three_line_logs FOR UPDATE USING (
  submitted_by_student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.sessions s JOIN public.requests r ON r.id = s.request_id WHERE s.id = session_id AND r.expert_id = auth.uid())
  OR public.current_user_role() = 'admin'
);

-- =============================================
-- REALTIME (for chat)
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_questions_student ON public.questions(student_id);
CREATE INDEX IF NOT EXISTS idx_slots_expert ON public.availability_slots(expert_id);
CREATE INDEX IF NOT EXISTS idx_requests_student ON public.requests(student_id);
CREATE INDEX IF NOT EXISTS idx_requests_expert ON public.requests(expert_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.chat_messages(thread_id);
