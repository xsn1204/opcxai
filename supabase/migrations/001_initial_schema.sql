-- OPC x AI 数据库 Schema
-- 执行顺序：在 Supabase Dashboard > SQL Editor 中运行此文件

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 用户表（与 Supabase Auth 绑定）
-- =============================================
CREATE TABLE IF NOT EXISTS public.talent_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username      text NOT NULL,
  bio           text,
  specialty     text,
  capability_modules  jsonb DEFAULT '[]',
  tool_stack    jsonb DEFAULT '[]',
  delivery_pref text DEFAULT 'result_bet' CHECK (delivery_pref IN ('result_bet', 'hourly')),
  avg_score     numeric(5,2),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.corp_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  company_name    text NOT NULL,
  contact_name    text NOT NULL,
  business_tracks jsonb DEFAULT '[]',
  is_verified     boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- =============================================
-- 需求/挑战表
-- =============================================
CREATE TABLE IF NOT EXISTS public.requirements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corp_id             uuid REFERENCES public.corp_profiles(id) ON DELETE CASCADE NOT NULL,
  title               text NOT NULL,
  intent_desc         text,
  ai_tags             jsonb DEFAULT '[]',
  business_stage      text DEFAULT 'growth' CHECK (business_stage IN ('startup', 'growth', 'mature')),
  complexity          text DEFAULT 'mid' CHECK (complexity IN ('junior', 'mid', 'expert')),
  budget_min          numeric,
  budget_max          numeric,
  currency            text DEFAULT 'CNY',
  deadline            date,
  question_types      jsonb DEFAULT '[]',
  capability_weights  jsonb DEFAULT '{}',
  attachments         jsonb DEFAULT '[]',
  status              text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'completed')),
  created_at          timestamptz DEFAULT now()
);

-- =============================================
-- AI 生成的考题
-- =============================================
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id      uuid REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
  seq                 integer NOT NULL,
  title               text NOT NULL,
  description         text,
  weight              integer DEFAULT 0,
  linked_attachment   text,
  created_at          timestamptz DEFAULT now()
);

-- =============================================
-- 人才提交的方案
-- =============================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id      uuid REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
  talent_id           uuid REFERENCES public.talent_profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_log    jsonb DEFAULT '[]',
  answers             jsonb DEFAULT '{}',
  status              text DEFAULT 'pending' CHECK (status IN ('pending', 'evaluated', 'invited', 'rejected')),
  ai_total_score      numeric(5,2),
  ai_score_breakdown  jsonb DEFAULT '{}',
  ai_diagnosis        jsonb DEFAULT '{}',
  submitted_at        timestamptz DEFAULT now(),
  UNIQUE (requirement_id, talent_id)
);

-- =============================================
-- 协作合约
-- =============================================
CREATE TABLE IF NOT EXISTS public.collaborations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id       uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
  requirement_id      uuid REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
  talent_id           uuid REFERENCES public.talent_profiles(id) ON DELETE CASCADE NOT NULL,
  corp_id             uuid REFERENCES public.corp_profiles(id) ON DELETE CASCADE NOT NULL,
  invitation_message  text,
  kpi_terms           jsonb DEFAULT '{}',
  status              text DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'active', 'completed', 'rejected')),
  created_at          timestamptz DEFAULT now()
);

-- =============================================
-- 聊天消息（留言板式）
-- =============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id    uuid REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL,
  sender_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content             text NOT NULL,
  attachment_url      text,
  sent_at             timestamptz DEFAULT now()
);

-- =============================================
-- 通知
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        text NOT NULL CHECK (type IN ('new_submission', 'invitation', 'message', 'invitation_accepted', 'invitation_rejected')),
  payload     jsonb DEFAULT '{}',
  is_read     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- talent_profiles: public read, owner update
CREATE POLICY "talent_profiles_select" ON public.talent_profiles
  FOR SELECT USING (true);

CREATE POLICY "talent_profiles_insert" ON public.talent_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "talent_profiles_update" ON public.talent_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- corp_profiles: public read, owner update
CREATE POLICY "corp_profiles_select" ON public.corp_profiles
  FOR SELECT USING (true);

CREATE POLICY "corp_profiles_insert" ON public.corp_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "corp_profiles_update" ON public.corp_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- requirements: active ones public to talent, corp sees own
CREATE POLICY "requirements_select_active" ON public.requirements
  FOR SELECT USING (
    status = 'active'
    OR corp_id IN (
      SELECT id FROM public.corp_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "requirements_insert" ON public.requirements
  FOR INSERT WITH CHECK (
    corp_id IN (SELECT id FROM public.corp_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "requirements_update" ON public.requirements
  FOR UPDATE USING (
    corp_id IN (SELECT id FROM public.corp_profiles WHERE user_id = auth.uid())
  );

-- exam_questions: readable by talent (active req) and corp owner
CREATE POLICY "exam_questions_select" ON public.exam_questions
  FOR SELECT USING (
    requirement_id IN (
      SELECT id FROM public.requirements
      WHERE status = 'active'
         OR corp_id IN (SELECT id FROM public.corp_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "exam_questions_insert" ON public.exam_questions
  FOR INSERT WITH CHECK (true); -- managed by API with service role

-- submissions: talent sees own, corp sees for their requirements
CREATE POLICY "submissions_select" ON public.submissions
  FOR SELECT USING (
    talent_id IN (SELECT id FROM public.talent_profiles WHERE user_id = auth.uid())
    OR requirement_id IN (
      SELECT id FROM public.requirements
      WHERE corp_id IN (SELECT id FROM public.corp_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "submissions_insert" ON public.submissions
  FOR INSERT WITH CHECK (
    talent_id IN (SELECT id FROM public.talent_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "submissions_update" ON public.submissions
  FOR UPDATE USING (true); -- managed by API

-- collaborations: both parties can see
CREATE POLICY "collaborations_select" ON public.collaborations
  FOR SELECT USING (
    talent_id IN (SELECT id FROM public.talent_profiles WHERE user_id = auth.uid())
    OR corp_id IN (SELECT id FROM public.corp_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "collaborations_insert" ON public.collaborations
  FOR INSERT WITH CHECK (
    corp_id IN (SELECT id FROM public.corp_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "collaborations_update" ON public.collaborations
  FOR UPDATE USING (
    talent_id IN (SELECT id FROM public.talent_profiles WHERE user_id = auth.uid())
    OR corp_id IN (SELECT id FROM public.corp_profiles WHERE user_id = auth.uid())
  );

-- messages: both parties in collaboration can read/write
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    collaboration_id IN (
      SELECT id FROM public.collaborations
      WHERE talent_id IN (SELECT id FROM public.talent_profiles WHERE user_id = auth.uid())
         OR corp_id IN (SELECT id FROM public.corp_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND collaboration_id IN (
      SELECT id FROM public.collaborations
      WHERE talent_id IN (SELECT id FROM public.talent_profiles WHERE user_id = auth.uid())
         OR corp_id IN (SELECT id FROM public.corp_profiles WHERE user_id = auth.uid())
    )
  );

-- notifications: user sees own
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (true); -- managed by API

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_requirements_status ON public.requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_corp_id ON public.requirements(corp_id);
CREATE INDEX IF NOT EXISTS idx_submissions_requirement_id ON public.submissions(requirement_id);
CREATE INDEX IF NOT EXISTS idx_submissions_talent_id ON public.submissions(talent_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_talent_id ON public.collaborations(talent_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_corp_id ON public.collaborations(corp_id);
CREATE INDEX IF NOT EXISTS idx_messages_collaboration_id ON public.messages(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, is_read);

-- =============================================
-- Helper function: update avg_score on talent
-- =============================================
CREATE OR REPLACE FUNCTION update_talent_avg_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.talent_profiles
  SET avg_score = (
    SELECT AVG(ai_total_score)
    FROM public.submissions
    WHERE talent_id = NEW.talent_id
      AND ai_total_score IS NOT NULL
      AND status = 'evaluated'
  )
  WHERE id = NEW.talent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_talent_avg_score
AFTER UPDATE OF ai_total_score ON public.submissions
FOR EACH ROW EXECUTE FUNCTION update_talent_avg_score();
