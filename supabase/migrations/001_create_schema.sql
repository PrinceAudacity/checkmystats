CREATE TYPE skill_status AS ENUM (
  'not_started',
  'in_progress',
  'mastered'
);

CREATE TYPE edu_level AS ENUM (
  'elem',
  'middle',
  'hs'
);

CREATE TABLE categories (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE skill_nodes (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  tier       INT NOT NULL CHECK (tier BETWEEN 0 AND 4),
  cat        TEXT NOT NULL REFERENCES categories(code),
  hrs        INT,
  asmt_count INT DEFAULT 0,
  edu_level  edu_level,
  summary    TEXT,
  mastery    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nodes_tier ON skill_nodes(tier);
CREATE INDEX idx_nodes_cat  ON skill_nodes(cat);

CREATE TABLE skill_edges (
  from_id TEXT NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  to_id   TEXT NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  PRIMARY KEY (from_id, to_id),
  CHECK (from_id != to_id)
);

CREATE INDEX idx_edges_to   ON skill_edges(to_id);
CREATE INDEX idx_edges_from ON skill_edges(from_id);

CREATE TABLE user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url   TEXT,
  theme        TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE user_skill_status (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id     TEXT NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  status       skill_status NOT NULL DEFAULT 'not_started',
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  hours_logged NUMERIC(6,1) DEFAULT 0,
  PRIMARY KEY (user_id, skill_id)
);

CREATE INDEX idx_uss_user   ON user_skill_status(user_id);
CREATE INDEX idx_uss_status ON user_skill_status(user_id, status);

CREATE TABLE user_career_paths (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES skill_nodes(id),
  added_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_id)
);

CREATE INDEX idx_ucp_user ON user_career_paths(user_id);

CREATE TABLE assessment_questions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id       TEXT NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  question_type  TEXT NOT NULL CHECK (question_type IN (
    'multiple_choice', 'true_false', 'short_answer', 'numeric'
  )),
  question_text  TEXT NOT NULL,
  choices        JSONB,
  correct_answer TEXT NOT NULL,
  explanation    TEXT,
  difficulty     INT DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_aq_skill ON assessment_questions(skill_id);

CREATE TABLE user_assessment_attempts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id     TEXT NOT NULL REFERENCES skill_nodes(id),
  questions    JSONB NOT NULL,
  answers      JSONB,
  score        NUMERIC(5,2),
  passed       BOOLEAN,
  started_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_uaa_user  ON user_assessment_attempts(user_id);
CREATE INDEX idx_uaa_skill ON user_assessment_attempts(user_id, skill_id);

CREATE TABLE saved_paths (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label      TEXT,
  start_id   TEXT NOT NULL REFERENCES skill_nodes(id),
  end_id     TEXT NOT NULL REFERENCES skill_nodes(id),
  path       JSONB NOT NULL,
  total_hours FLOAT NOT NULL,
  node_count INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
