# CheckMyStats — Backend Specification

## Supabase Schema, Taxonomy, Seed Data & API Design

**Version:** 2.0  
**Last updated:** 2026-03-17  
**Audience:** Backend engineers implementing the Supabase layer

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Taxonomy Design](#2-taxonomy-design)
3. [Database Schema](#3-database-schema)
4. [Row Level Security](#4-row-level-security)
5. [Seed Data Strategy](#5-seed-data-strategy)
6. [Database Functions](#6-database-functions)
7. [Edge Functions](#7-edge-functions)
8. [Storage & Realtime](#8-storage--realtime)
9. [Migration Order](#9-migration-order)
10. [Appendix A: Full Node Registry](#appendix-a-full-node-registry)
11. [Appendix B: Full Edge Registry](#appendix-b-full-edge-registry)

---

## 1. System Overview

CheckMyStats is a skill-mapping application for STEM engineering disciplines. Users explore a large prerequisite graph of ~190 skills spanning elementary math through career-level engineering outcomes, track their progress, take assessments, and build career path plans.

### Architecture

```
React Frontend (Vite + TypeScript)
        │
        ├── @supabase/supabase-js client
        │
Supabase Platform
        ├── PostgreSQL  — schema, RLS, functions
        ├── Auth        — email/password, OAuth
        ├── Edge Funcs  — assessment generation, grading, resume export
        ├── Storage     — avatars, exports
        └── Realtime    — skill status sync
```

### Core Data Flows

1. **Read taxonomy** — Client fetches full node + edge graph on app load (public, cacheable)
2. **User progress** — Client reads/writes per-user skill status (authenticated, RLS-protected)
3. **Career paths** — Client adds career paths; server computes prerequisite tree via recursive CTE
4. **Assessments** — Edge function generates questions, client submits answers, edge function grades and updates status
5. **Resume export** — Edge function generates structured output from user's mastered skills

---

## 2. Taxonomy Design

### 2.1 Tier System

The graph has **5 tiers** representing the progression from foundational knowledge to career outcomes:

| Tier | Name | Count | Description |
|------|------|-------|-------------|
| 0 | Foundation Roots | 27 | Universal core skills: arithmetic through calculus, physics, chemistry, biology, computing, technical writing |
| 1 | Advanced Skills | 93 | Field-specific technical competencies grouped by discipline |
| 2 | Specializations | 15 | Degree-level engineering disciplines (e.g., "Mechanical Engineering") |
| 3 | Credential Hubs | 5 | Degree and licensure gateways: BS, MS, PhD, PE License, Professional Certification |
| 4 | Career Outcomes | 55 | Job titles reachable through the credential hubs |

**Total: 195 nodes, ~430 edges**

### 2.2 Why Credential Hubs Matter

The previous taxonomy connected specializations directly to careers. This is inaccurate — you don't become a "Mechanical Engineer" by completing Mechanical Engineering coursework alone. You need a credential (typically a BS degree). Some careers require an MS or PhD. Structural engineers need a PE license.

The credential hub layer models this correctly:

```
Specialization (Tier 2)
    └──→ BS in Engineering (Tier 3)
              ├──→ Mechanical Engineer (Tier 4)
              ├──→ Thermal Engineer (Tier 4)
              └──→ PE License (Tier 3)
                      └──→ Structural Engineer (Tier 4)
```

This lets the frontend show users which degree level their target career requires.

### 2.3 Category System

Each node belongs to one category. Categories determine color coding and sector positioning on the full map.

| Code | Name | Color | Description |
|------|------|-------|-------------|
| MATH | Mathematics | `#5577ee` | Pure and applied math from counting through optimization |
| SCI | Science | `#44bb88` | Physics, chemistry, biology |
| CS | Computing | `#ee8833` | Programming, MATLAB, C++ |
| ENG | Eng Tools | `#8899bb` | CAD, FEA, CFD, system modeling, technical writing |
| ME | Mechanical | `#3399ff` | Statics through vibrations |
| EE | Electrical | `#ffcc33` | Circuits through VLSI |
| CE | Civil | `#55cc77` | Surveying through construction management |
| CHE | Chemical | `#ff5555` | Mass balances through polymers |
| AERO | Aerospace | `#9966ff` | Aerodynamics through avionics |
| BME | Biomedical | `#ff55aa` | Physiology through FDA regulation |
| ENVE | Environmental | `#44ccaa` | Water treatment through hydrology |
| IE | Industrial | `#ff9944` | Ergonomics through project management |
| MAT | Materials | `#99cc44` | Structure through nanomaterials |
| NUKE | Nuclear | `#ffaa44` | Nuclear physics through safety |
| ROB | Robotics | `#44bbff` | Kinematics through ROS |
| CRED | Credentials | `#c8a84b` | Degree and licensure hubs |

### 2.4 Education Level Tags (Tier 0 only)

Foundation nodes carry an `edu_level` tag indicating when the skill is typically learned. This is used for visual grouping on the spiral layout.

| Tag | Label | Typical Age |
|-----|-------|-------------|
| `elem` | Elementary | Ages 5–10 |
| `middle` | Middle School | Ages 11–13 |
| `hs` | High School / GED | Ages 14–18 |

### 2.5 Node Fields

Every node has these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text (PK) | Yes | Unique snake_case identifier |
| `name` | text | Yes | Human-readable display name |
| `tier` | int (0–4) | Yes | Position in the hierarchy |
| `cat` | text (FK) | Yes | Category code |
| `hrs` | int | No | Estimated learning hours (null for tier 2–4) |
| `asmt` | int | No | Number of assessment questions available |
| `edu_level` | text | No | Only for tier 0: `elem`, `middle`, `hs` |
| `summary` | text | No | 1–2 sentence description of the skill |
| `mastery` | text | No | What the learner must demonstrate to complete this node |

### 2.6 Edge Semantics

Every edge `(from_id, to_id)` means: **from_id is a prerequisite of to_id**. The graph is a DAG (directed acyclic graph). There are no cycles.

Edge types by tier transition:

| From Tier | To Tier | Meaning | Example |
|-----------|---------|---------|---------|
| 0 → 0 | Foundation chain | Counting → Addition |
| 0 → 1 | Foundation feeds advanced | Calculus I → Statics |
| 1 → 1 | Advanced skill chain | Statics → Dynamics |
| 1 → 2 | Skills compose a specialization | Statics + Dynamics + ... → Mechanical Eng |
| 2 → 3 | Specialization qualifies for credential | Mechanical Eng → BS in Engineering |
| 3 → 3 | Credential chains | BS → PE License |
| 3 → 4 | Credential enables career | BS → Mechanical Engineer |

---

## 3. Database Schema

### 3.1 Migration: `001_create_schema.sql`

```sql
-- ═══════════════════════════════════════════════
--  ENUMS
-- ═══════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════
--  CATEGORIES
-- ═══════════════════════════════════════════════

CREATE TABLE categories (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,       -- hex color e.g. '#5577ee'
  sort_order  INT NOT NULL DEFAULT 0
);

-- ═══════════════════════════════════════════════
--  SKILL NODES
-- ═══════════════════════════════════════════════

CREATE TABLE skill_nodes (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  tier        INT NOT NULL CHECK (tier BETWEEN 0 AND 4),
  cat         TEXT NOT NULL REFERENCES categories(code),
  hrs         INT,                 -- estimated hours (nullable for tier 2-4)
  asmt_count  INT DEFAULT 0,       -- number of assessment questions
  edu_level   edu_level,           -- only for tier 0
  summary     TEXT,                -- 1-2 sentence description
  mastery     TEXT,                -- mastery criteria description
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nodes_tier ON skill_nodes(tier);
CREATE INDEX idx_nodes_cat ON skill_nodes(cat);

-- ═══════════════════════════════════════════════
--  SKILL EDGES (prerequisite graph)
-- ═══════════════════════════════════════════════

CREATE TABLE skill_edges (
  from_id     TEXT NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  to_id       TEXT NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  PRIMARY KEY (from_id, to_id),
  CHECK (from_id != to_id)
);

CREATE INDEX idx_edges_to ON skill_edges(to_id);
CREATE INDEX idx_edges_from ON skill_edges(from_id);

-- ═══════════════════════════════════════════════
--  USER PROFILES
-- ═══════════════════════════════════════════════

CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  avatar_url      TEXT,
  theme           TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
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

-- ═══════════════════════════════════════════════
--  USER SKILL STATUS
-- ═══════════════════════════════════════════════

CREATE TABLE user_skill_status (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id    TEXT NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  status      skill_status NOT NULL DEFAULT 'not_started',
  started_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  hours_logged NUMERIC(6,1) DEFAULT 0,
  PRIMARY KEY (user_id, skill_id)
);

CREATE INDEX idx_uss_user ON user_skill_status(user_id);
CREATE INDEX idx_uss_status ON user_skill_status(user_id, status);

-- ═══════════════════════════════════════════════
--  USER CAREER PATHS
-- ═══════════════════════════════════════════════

CREATE TABLE user_career_paths (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id   TEXT NOT NULL REFERENCES skill_nodes(id),
  added_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_id)
);

CREATE INDEX idx_ucp_user ON user_career_paths(user_id);

-- ═══════════════════════════════════════════════
--  ASSESSMENTS
-- ═══════════════════════════════════════════════

CREATE TABLE assessment_questions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id        TEXT NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  question_type   TEXT NOT NULL CHECK (question_type IN (
    'multiple_choice', 'true_false', 'short_answer', 'numeric'
  )),
  question_text   TEXT NOT NULL,
  choices         JSONB,           -- for multiple_choice: ["A", "B", "C", "D"]
  correct_answer  TEXT NOT NULL,   -- index for MC ("2"), text for short answer
  explanation     TEXT,            -- shown after grading
  difficulty      INT DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_aq_skill ON assessment_questions(skill_id);

CREATE TABLE user_assessment_attempts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id        TEXT NOT NULL REFERENCES skill_nodes(id),
  questions       JSONB NOT NULL,  -- ordered list of question IDs used
  answers         JSONB,           -- user's submitted answers
  score           NUMERIC(5,2),    -- percentage 0-100
  passed          BOOLEAN,
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_uaa_user ON user_assessment_attempts(user_id);
CREATE INDEX idx_uaa_skill ON user_assessment_attempts(user_id, skill_id);

-- ═══════════════════════════════════════════════
--  UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════

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
```

---

## 4. Row Level Security

### 4.1 Migration: `002_rls_policies.sql`

```sql
-- Enable RLS on all user-facing tables
ALTER TABLE skill_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_career_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assessment_attempts ENABLE ROW LEVEL SECURITY;

-- ── Public read: taxonomy data ──
CREATE POLICY "Anyone can read nodes"
  ON skill_nodes FOR SELECT USING (true);

CREATE POLICY "Anyone can read edges"
  ON skill_edges FOR SELECT USING (true);

CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Anyone can read questions"
  ON assessment_questions FOR SELECT USING (true);

-- ── User profiles ──
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Skill status ──
CREATE POLICY "Users can read own status"
  ON user_skill_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own status"
  ON user_skill_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status"
  ON user_skill_status FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own status"
  ON user_skill_status FOR DELETE
  USING (auth.uid() = user_id);

-- ── Career paths ──
CREATE POLICY "Users can read own paths"
  ON user_career_paths FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paths"
  ON user_career_paths FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own paths"
  ON user_career_paths FOR DELETE
  USING (auth.uid() = user_id);

-- ── Assessment attempts ──
CREATE POLICY "Users can read own attempts"
  ON user_assessment_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON user_assessment_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts"
  ON user_assessment_attempts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 5. Seed Data Strategy

The full taxonomy is too large to inline in this document. Seed data is delivered as a separate migration file `003_seed_taxonomy.sql` containing:

1. **16 category inserts** — one per category code
2. **195 node inserts** — all skill_nodes with full summary and mastery text
3. **~430 edge inserts** — the complete prerequisite graph

### 5.1 Category Seed (included here for reference)

```sql
INSERT INTO categories (code, name, color, sort_order) VALUES
  ('MATH', 'Mathematics',    '#5577ee', 1),
  ('SCI',  'Science',        '#44bb88', 2),
  ('CS',   'Computing',      '#ee8833', 3),
  ('ENG',  'Eng Tools',      '#8899bb', 4),
  ('ME',   'Mechanical',     '#3399ff', 5),
  ('EE',   'Electrical',     '#ffcc33', 6),
  ('CE',   'Civil',          '#55cc77', 7),
  ('CHE',  'Chemical',       '#ff5555', 8),
  ('AERO', 'Aerospace',      '#9966ff', 9),
  ('BME',  'Biomedical',     '#ff55aa', 10),
  ('ENVE', 'Environmental',  '#44ccaa', 11),
  ('IE',   'Industrial',     '#ff9944', 12),
  ('MAT',  'Materials',      '#99cc44', 13),
  ('NUKE', 'Nuclear',        '#ffaa44', 14),
  ('ROB',  'Robotics',       '#44bbff', 15),
  ('CRED', 'Credentials',    '#c8a84b', 16);
```

### 5.2 Node Seed Format

Each node insert follows this pattern:

```sql
INSERT INTO skill_nodes (id, name, tier, cat, hrs, asmt_count, edu_level, summary, mastery)
VALUES (
  'f_counting',
  'Counting & Number Sense',
  0, 'MATH', 10, 5, 'elem',
  'Recognition of quantities, ordering, and basic number relationships.',
  'Count, compare, and order integers up to 1,000,000. Understand place value.'
);
```

### 5.3 Edge Seed Format

```sql
INSERT INTO skill_edges (from_id, to_id) VALUES
  ('f_counting', 'f_addition'),
  ('f_counting', 'f_subtraction'),
  -- ... all ~430 edges
;
```

### 5.4 Node Registry Summary

The full node list with all fields is provided in **Appendix A**. The full edge list is in **Appendix B**. The backend engineer should translate these directly into SQL INSERT statements.

**Critical note:** The `adv_prog_eng` node appears only once. The previous taxonomy JS file had a duplicate definition — this is corrected.

---

## 6. Database Functions

### 6.1 Recursive Prerequisite Path

This is the most important function. Given a target node (typically a Tier 2 specialization or Tier 4 career), it walks backward through all prerequisites and returns the full subgraph.

```sql
-- 003_functions.sql

CREATE OR REPLACE FUNCTION get_prerequisite_tree(target_id TEXT)
RETURNS TABLE (
  node_id   TEXT,
  edge_from TEXT,
  edge_to   TEXT
) AS $$
BEGIN
  -- Return all ancestor nodes via recursive CTE
  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    -- Base: the target node itself
    SELECT target_id AS nid, NULL::TEXT AS efrom, NULL::TEXT AS eto

    UNION

    -- Recurse: find all prerequisites
    SELECT e.from_id, e.from_id, e.to_id
    FROM skill_edges e
    INNER JOIN ancestors a ON e.to_id = a.nid
  )
  SELECT DISTINCT a.nid, a.efrom, a.eto
  FROM ancestors a;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_prerequisite_tree IS
  'Returns all ancestor nodes and edges for a given target node. '
  'Used to build career path views.';
```

**Usage from client:**
```ts
const { data } = await supabase.rpc('get_prerequisite_tree', {
  target_id: 'sp_mech_eng'
});
```

### 6.2 Career Path with User Progress

Returns the prerequisite tree overlaid with the user's current status for each node.

```sql
CREATE OR REPLACE FUNCTION get_career_path_with_progress(
  p_user_id UUID,
  p_target_id TEXT
)
RETURNS TABLE (
  node_id     TEXT,
  node_name   TEXT,
  tier        INT,
  cat         TEXT,
  hrs         INT,
  status      skill_status,
  edge_from   TEXT,
  edge_to     TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    SELECT p_target_id AS nid, NULL::TEXT AS efrom, NULL::TEXT AS eto
    UNION
    SELECT e.from_id, e.from_id, e.to_id
    FROM skill_edges e
    INNER JOIN ancestors a ON e.to_id = a.nid
  ),
  tree_nodes AS (
    SELECT DISTINCT a.nid, a.efrom, a.eto FROM ancestors a
  )
  SELECT
    sn.id,
    sn.name,
    sn.tier,
    sn.cat,
    sn.hrs,
    COALESCE(uss.status, 'not_started'::skill_status),
    tn.efrom,
    tn.eto
  FROM tree_nodes tn
  JOIN skill_nodes sn ON sn.id = tn.nid
  LEFT JOIN user_skill_status uss
    ON uss.skill_id = sn.id AND uss.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 6.3 Mark Skill Complete

Validates prerequisites are met before allowing completion.

```sql
CREATE OR REPLACE FUNCTION mark_skill_complete(
  p_user_id UUID,
  p_skill_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  unmet_count INT;
  result JSONB;
BEGIN
  -- Check all prerequisites are mastered
  SELECT COUNT(*) INTO unmet_count
  FROM skill_edges e
  LEFT JOIN user_skill_status uss
    ON uss.skill_id = e.from_id AND uss.user_id = p_user_id
  WHERE e.to_id = p_skill_id
    AND (uss.status IS NULL OR uss.status != 'mastered');

  IF unmet_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'prerequisites_not_met',
      'unmet_count', unmet_count
    );
  END IF;

  -- Upsert the status
  INSERT INTO user_skill_status (user_id, skill_id, status, completed_at)
  VALUES (p_user_id, p_skill_id, 'mastered', now())
  ON CONFLICT (user_id, skill_id) DO UPDATE SET
    status = 'mastered',
    completed_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.4 Mark Path Complete (Batch)

Marks all prerequisites of a target node as mastered in one transaction.

```sql
CREATE OR REPLACE FUNCTION mark_path_complete(
  p_user_id UUID,
  p_target_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  affected INT;
BEGIN
  WITH RECURSIVE ancestors AS (
    SELECT p_target_id AS nid
    UNION
    SELECT e.from_id
    FROM skill_edges e
    INNER JOIN ancestors a ON e.to_id = a.nid
  )
  INSERT INTO user_skill_status (user_id, skill_id, status, completed_at)
  SELECT p_user_id, nid, 'mastered', now()
  FROM ancestors
  ON CONFLICT (user_id, skill_id) DO UPDATE SET
    status = 'mastered',
    completed_at = COALESCE(user_skill_status.completed_at, now());

  GET DIAGNOSTICS affected = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'nodes_marked', affected
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.5 User Progress Summary

```sql
CREATE OR REPLACE FUNCTION get_user_progress(p_user_id UUID)
RETURNS TABLE (
  total_nodes     BIGINT,
  mastered        BIGINT,
  in_progress     BIGINT,
  not_started     BIGINT,
  total_hours     NUMERIC,
  hours_completed NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM skill_nodes)::BIGINT,
    COUNT(*) FILTER (WHERE uss.status = 'mastered')::BIGINT,
    COUNT(*) FILTER (WHERE uss.status = 'in_progress')::BIGINT,
    ((SELECT COUNT(*) FROM skill_nodes) -
      COUNT(*) FILTER (WHERE uss.status IS NOT NULL))::BIGINT,
    (SELECT COALESCE(SUM(hrs), 0) FROM skill_nodes)::NUMERIC,
    COALESCE(SUM(
      CASE WHEN uss.status = 'mastered' THEN sn.hrs ELSE 0 END
    ), 0)::NUMERIC
  FROM skill_nodes sn
  LEFT JOIN user_skill_status uss
    ON uss.skill_id = sn.id AND uss.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 6.6 Check Prerequisites Met

```sql
CREATE OR REPLACE FUNCTION check_prerequisites_met(
  p_user_id UUID,
  p_skill_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  unmet INT;
BEGIN
  SELECT COUNT(*) INTO unmet
  FROM skill_edges e
  LEFT JOIN user_skill_status uss
    ON uss.skill_id = e.from_id AND uss.user_id = p_user_id
  WHERE e.to_id = p_skill_id
    AND (uss.status IS NULL OR uss.status != 'mastered');

  RETURN unmet = 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

---

## 7. Edge Functions

### 7.1 Generate Assessment

**Path:** `supabase/functions/generate-assessment/index.ts`

**Purpose:** Given a skill_id, selects questions from the bank, creates an attempt record, and returns the question set (without answers).

```typescript
// Pseudocode — implement with Deno + supabase-js

interface RequestBody {
  skill_id: string;
  question_count?: number; // default 5
}

interface ResponseBody {
  attempt_id: string;
  questions: {
    id: string;
    question_text: string;
    question_type: string;
    choices?: string[];
  }[];
}

// 1. Verify auth token
// 2. Fetch random questions for skill_id
//    SELECT * FROM assessment_questions
//    WHERE skill_id = $1
//    ORDER BY random()
//    LIMIT $2
// 3. Create attempt record with question IDs
// 4. Return questions WITHOUT correct_answer or explanation
```

### 7.2 Grade Assessment

**Path:** `supabase/functions/grade-assessment/index.ts`

**Purpose:** Receives user answers, grades them, updates the attempt, and optionally marks the skill as mastered.

```typescript
interface RequestBody {
  attempt_id: string;
  answers: Record<string, string>; // question_id -> answer
}

interface ResponseBody {
  score: number;           // 0-100
  passed: boolean;         // score >= 70
  results: {
    question_id: string;
    correct: boolean;
    correct_answer: string;
    explanation: string;
  }[];
  skill_mastered: boolean; // if passed, did we mark the skill?
}

// 1. Verify auth, load attempt
// 2. Load correct answers for each question
// 3. Grade, compute score
// 4. Update attempt record with answers, score, passed, completed_at
// 5. If passed (>= 70%):
//    - Call mark_skill_complete() RPC
//    - Set skill_mastered = true in response
```

### 7.3 Resume Export (Future)

**Path:** `supabase/functions/export-resume/index.ts`

Generates a structured JSON or PDF of a user's completed skills and career path progress. Lower priority — stub the endpoint now, implement later.

---

## 8. Storage & Realtime

### 8.1 Storage Buckets

```sql
-- Run via Supabase dashboard or CLI
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Policy: users can upload to their own folder
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
```

### 8.2 Realtime

Enable realtime on `user_skill_status` so progress syncs across tabs:

```sql
ALTER PUBLICATION supabase_realtime
  ADD TABLE user_skill_status;
```

The frontend subscribes:
```typescript
supabase.channel('skill-progress')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'user_skill_status',
    filter: `user_id=eq.${userId}`
  }, handleChange)
  .subscribe();
```

---

## 9. Migration Order

Execute in this exact order:

| # | File | Description |
|---|------|-------------|
| 1 | `001_create_schema.sql` | All tables, indexes, triggers, enums |
| 2 | `002_rls_policies.sql` | Row level security policies |
| 3 | `003_seed_categories.sql` | 16 category rows |
| 4 | `004_seed_nodes.sql` | 195 skill node rows |
| 5 | `005_seed_edges.sql` | ~430 edge rows |
| 6 | `006_functions.sql` | All PL/pgSQL functions |
| 7 | `007_storage.sql` | Storage buckets and policies |
| 8 | `008_realtime.sql` | Realtime publication |

Edge functions are deployed separately via `supabase functions deploy`.

---

## Appendix A: Full Node Registry

### Tier 0 — Foundation Roots (27 nodes)

| ID | Name | Cat | Hrs | Edu | Summary |
|----|------|-----|-----|-----|---------|
| `f_counting` | Counting & Number Sense | MATH | 10 | elem | Recognition of quantities, ordering, and basic number relationships |
| `f_addition` | Basic Addition | MATH | 15 | elem | Single and multi-digit addition including carrying |
| `f_subtraction` | Basic Subtraction | MATH | 15 | elem | Single and multi-digit subtraction including borrowing |
| `f_multiplication` | Multiplication | MATH | 25 | elem | Times tables through 12 and long multiplication |
| `f_division` | Division | MATH | 20 | elem | Long division, remainders, division-multiplication relationship |
| `f_fractions` | Fractions & Decimals | MATH | 30 | elem | Equivalent fractions, mixed numbers, fraction arithmetic |
| `f_negative` | Negative Numbers & Integers | MATH | 20 | middle | Number line, absolute value, signed arithmetic |
| `f_ratios` | Ratios & Proportional Reasoning | MATH | 25 | middle | Ratios, rates, unit conversion, dimensional analysis |
| `f_percentages` | Percentages | MATH | 20 | middle | Percentage calculations and percent change |
| `f_algebra1` | Algebra I | MATH | 60 | middle | Variables, linear equations, systems, intro to functions |
| `f_geometry` | Geometry — Foundations | MATH | 50 | middle | Euclidean geometry, proofs, coordinate geometry, area/volume |
| `f_logic` | Logic & Deductive Reasoning | MATH | 25 | middle | Boolean logic, truth tables, proof structures |
| `f_stats_basic` | Introductory Statistics & Probability | MATH | 40 | middle | Descriptive stats, basic probability, distributions |
| `f_sci_method` | Scientific Method & Lab Skills | SCI | 20 | middle | Experimental design, measurement, error analysis |
| `f_comp_basics` | Computer Basics | CS | 20 | middle | Hardware, OS, file management, basic software |
| `f_spreadsheets` | Spreadsheet & Data Fundamentals | CS | 25 | middle | Excel/Sheets for engineering calculations |
| `f_algebra2` | Algebra II | MATH | 70 | hs | Quadratic, polynomial, exponential, log functions |
| `f_trig` | Trigonometry | MATH | 45 | hs | Trig functions, unit circle, identities, triangle solving |
| `f_precalc` | Precalculus | MATH | 80 | hs | Functions, transformations, polar, parametric, vectors, limits |
| `f_calculus1` | Calculus I — Differentiation | MATH | 90 | hs | Limits, derivatives, differentiation rules, optimization |
| `f_calculus2` | Calculus II — Integration | MATH | 90 | hs | Integrals, techniques, improper integrals, series |
| `f_physics_mech` | Physics — Mechanics | SCI | 65 | hs | Kinematics, Newton's laws, work/energy, momentum, rotation |
| `f_physics_em` | Physics — Electricity & Magnetism | SCI | 60 | hs | E fields, circuits, capacitance, magnetism, Faraday's law |
| `f_physics_waves` | Physics — Waves, Optics & Modern | SCI | 50 | hs | Waves, sound, optics, quantum basics, nuclear |
| `f_chem_general` | General Chemistry | SCI | 70 | hs | Atomic structure, bonding, stoichiometry, equilibrium |
| `f_bio_basic` | Biology — Cell & Molecular Basics | SCI | 40 | hs | Cell structure, metabolism, DNA, genetics |
| `f_tech_writing` | Technical Writing & Communication | ENG | 35 | hs | Reports, specs, lab docs, drawing interpretation |

### Tier 1 — Advanced Skills (93 nodes)

**Engineering Mathematics (8):** `adv_multivariable`, `adv_linear_alg`, `adv_diff_eq`, `adv_numerical`, `adv_complex_anal`, `adv_optimization`, `adv_stats_eng`, `adv_discrete`

**Computing (3):** `adv_prog_eng`, `adv_matlab`, `adv_cpp`

**Eng Tools (4):** `adv_cad`, `adv_fea`, `adv_cfd`, `adv_systems_model`

**Mechanical (9):** `me_statics`, `me_dynamics`, `me_mechanics_mats`, `me_thermo`, `me_fluid`, `me_heat_transfer`, `me_machine_design`, `me_manufacturing`, `me_vibrations`

**Electrical (10):** `ee_circuits`, `ee_electronics`, `ee_digital`, `ee_signals`, `ee_electromagnetics`, `ee_power`, `ee_control`, `ee_microcontrollers`, `ee_vlsi`, `ee_telecom`

**Civil (9):** `ce_surveying`, `ce_structural`, `ce_concrete`, `ce_steel`, `ce_geotech`, `ce_hydraulics`, `ce_transport`, `ce_construction_mgmt`, `ce_env_eng`

**Chemical (8):** `che_mass_energy`, `che_thermo`, `che_transport`, `che_kinetics`, `che_separations`, `che_process_design`, `che_process_control`, `che_polymer`

**Aerospace (6):** `aero_aero`, `aero_flight_mech`, `aero_propulsion`, `aero_structures`, `aero_orbital`, `aero_avionics`

**Biomedical (7):** `bme_physiology`, `bme_biomechanics`, `bme_bioinstrumentation`, `bme_biomaterials`, `bme_medical_imaging`, `bme_tissue_eng`, `bme_reg_affairs`

**Environmental (5):** `enve_water`, `enve_air`, `enve_solid_waste`, `enve_sustainability`, `enve_hydrology`

**Industrial (8):** `ie_ergonomics`, `ie_work_study`, `ie_operations`, `ie_quality`, `ie_supply_chain`, `ie_facilities`, `ie_systems_eng`, `ie_project_mgmt`

**Materials (6):** `mat_structure`, `mat_mechanical`, `mat_processing`, `mat_electronic`, `mat_characterization`, `mat_biomaterials`

**Nuclear (5):** `nuke_physics`, `nuke_transport`, `nuke_reactor`, `nuke_thermal`, `nuke_safety`

**Robotics (6):** `rob_kinematics`, `rob_dynamics_ctrl`, `rob_perception`, `rob_planning`, `rob_actuators`, `rob_ros`

*Full field data (summary, mastery, hrs, asmt_count) for each Tier 1 node is provided in the taxonomy JS file and should be transcribed directly into INSERT statements.*

### Tier 2 — Specializations (15 nodes)

| ID | Name | Cat |
|----|------|-----|
| `sp_mech_eng` | Mechanical Engineering | ME |
| `sp_elec_eng` | Electrical Engineering | EE |
| `sp_comp_eng` | Computer Engineering | EE |
| `sp_civil_eng` | Civil Engineering | CE |
| `sp_structural_eng` | Structural Engineering | CE |
| `sp_chem_eng` | Chemical Engineering | CHE |
| `sp_aero_eng` | Aerospace Engineering | AERO |
| `sp_bio_eng` | Biomedical Engineering | BME |
| `sp_env_eng` | Environmental Engineering | ENVE |
| `sp_industrial_eng` | Industrial & Systems Engineering | IE |
| `sp_materials_sci` | Materials Science & Engineering | MAT |
| `sp_nuclear_eng` | Nuclear Engineering | NUKE |
| `sp_robotics_eng` | Robotics & Mechatronics | ROB |
| `sp_mfg_eng` | Manufacturing Engineering | ME |
| `sp_petroleum_eng` | Petroleum Engineering | CHE |

### Tier 3 — Credential Hubs (5 nodes)

| ID | Name | Cat | Summary |
|----|------|-----|---------|
| `hub_bs_eng` | Bachelor of Science in Engineering | CRED | 4-year ABET-accredited degree. Gateway to most engineering roles and PE licensure. |
| `hub_ms_eng` | Master of Science in Engineering | CRED | Advanced specialization. Required for research roles, certain technical leadership positions, and specialized careers like GNC or imaging science. |
| `hub_phd_eng` | PhD in Engineering | CRED | Research doctorate. Required for tenure-track faculty, national lab research leads, and advanced R&D positions. |
| `hub_pe_license` | Professional Engineer (PE) License | CRED | State licensure to offer engineering services to the public, stamp drawings, and lead regulated projects. Requires BS + FE Exam + 4 years experience + PE Exam. |
| `hub_cert_eng` | Professional Engineering Certification | CRED | Industry certifications: PMP, Six Sigma Black Belt, AWS CWI, CEM, etc. |

### Tier 4 — Career Outcomes (55 nodes)

**Mechanical (5):** `car_mech_eng`, `car_thermal_eng`, `car_mfg_eng`, `car_automotive_eng`, `car_product_dev`

**Electrical (7):** `car_elec_eng`, `car_power_eng`, `car_controls_eng`, `car_rf_eng`, `car_ic_designer`, `car_embedded_eng`, `car_avionics_eng`

**Civil (5):** `car_civil_eng`, `car_struct_eng`, `car_geotechnical`, `car_transport_eng`, `car_water_resources`

**Chemical (5):** `car_chem_eng`, `car_process_eng`, `car_process_safety`, `car_pharma_mfg`, `car_petroleum_eng`

**Aerospace (5):** `car_aero_eng`, `car_propulsion_eng`, `car_flight_test`, `car_spacecraft_eng`, `car_guidance_nav`

**Biomedical (5):** `car_bme_eng`, `car_medical_device`, `car_clinical_eng`, `car_imaging_scientist`, `car_tissue_eng`

**Environmental (4):** `car_env_eng`, `car_sustainability`, `car_remediation`, `car_water_eng`

**Industrial (6):** `car_industrial_eng`, `car_process_imp`, `car_supply_chain_eng`, `car_quality_eng`, `car_systems_eng`, `car_project_eng`

**Materials (4):** `car_materials_eng`, `car_metallurgist`, `car_composites_eng`, `car_semiconductor`

**Nuclear (3):** `car_nuclear_eng`, `car_radiation_safety`, `car_fusion_eng`

**Robotics (3):** `car_robotics_eng`, `car_autonomy_eng`, `car_mechatronics`

**General (3):** `car_research_eng`, `car_professor`, `car_tech_consultant`

---

## Appendix B: Full Edge Registry

### Tier 0 Internal Chain (34 edges)

```
f_counting → f_addition
f_counting → f_subtraction
f_addition → f_multiplication
f_subtraction → f_multiplication
f_multiplication → f_division
f_division → f_fractions
f_fractions → f_negative
f_fractions → f_ratios
f_fractions → f_percentages
f_negative → f_algebra1
f_ratios → f_algebra1
f_percentages → f_algebra1
f_algebra1 → f_algebra2
f_algebra1 → f_geometry
f_algebra2 → f_trig
f_geometry → f_trig
f_trig → f_precalc
f_algebra2 → f_precalc
f_precalc → f_calculus1
f_calculus1 → f_calculus2
f_algebra1 → f_stats_basic
f_algebra2 → f_stats_basic
f_algebra1 → f_logic
f_comp_basics → f_spreadsheets
f_algebra1 → f_physics_mech
f_calculus1 → f_physics_mech
f_algebra2 → f_physics_em
f_calculus1 → f_physics_em
f_physics_mech → f_physics_waves
f_physics_em → f_physics_waves
f_algebra1 → f_chem_general
f_fractions → f_chem_general
f_chem_general → f_bio_basic
f_physics_mech → f_sci_method
```

### Tier 0/1 → Tier 1: Engineering Math & Computing (22 edges)

```
f_calculus1 → adv_multivariable
f_calculus2 → adv_multivariable
f_algebra2 → adv_linear_alg
f_calculus1 → adv_linear_alg
f_calculus2 → adv_diff_eq
adv_linear_alg → adv_diff_eq
adv_linear_alg → adv_numerical
adv_diff_eq → adv_numerical
f_calculus2 → adv_complex_anal
adv_diff_eq → adv_complex_anal
adv_linear_alg → adv_optimization
f_calculus1 → adv_optimization
f_stats_basic → adv_stats_eng
adv_linear_alg → adv_stats_eng
f_algebra2 → adv_discrete
f_logic → adv_discrete
f_comp_basics → adv_prog_eng
f_algebra1 → adv_prog_eng
adv_prog_eng → adv_matlab
adv_prog_eng → adv_cpp
f_tech_writing → adv_cad
f_geometry → adv_cad
```

### Discipline-Specific Tier 1 Edges

*All edges from the taxonomy JS file (Mechanical, Electrical, Civil, Chemical, Aerospace, Biomedical, Environmental, Industrial, Materials, Nuclear, Robotics, and cross-discipline FEA/CFD/Systems Modeling) carry over unchanged. The backend engineer should transcribe directly from the `EDGES` array in `checkmystats_engineering_taxonomy.js`.*

### Tier 1 → Tier 2: Specialization Composition

*All edges connecting Tier 1 skills to Tier 2 specializations carry over unchanged from the taxonomy file.*

### Tier 2 → Tier 3: Credential Hub Routing (NEW)

```
sp_mech_eng → hub_bs_eng
sp_elec_eng → hub_bs_eng
sp_comp_eng → hub_bs_eng
sp_civil_eng → hub_bs_eng
sp_structural_eng → hub_bs_eng
sp_chem_eng → hub_bs_eng
sp_aero_eng → hub_bs_eng
sp_bio_eng → hub_bs_eng
sp_env_eng → hub_bs_eng
sp_industrial_eng → hub_bs_eng
sp_materials_sci → hub_bs_eng
sp_nuclear_eng → hub_bs_eng
sp_robotics_eng → hub_bs_eng
sp_mfg_eng → hub_bs_eng
sp_petroleum_eng → hub_bs_eng

sp_mech_eng → hub_ms_eng
sp_elec_eng → hub_ms_eng
sp_civil_eng → hub_ms_eng
sp_structural_eng → hub_ms_eng
sp_chem_eng → hub_ms_eng
sp_aero_eng → hub_ms_eng
sp_bio_eng → hub_ms_eng
sp_nuclear_eng → hub_ms_eng
sp_robotics_eng → hub_ms_eng
sp_materials_sci → hub_ms_eng

sp_mech_eng → hub_phd_eng
sp_elec_eng → hub_phd_eng
sp_chem_eng → hub_phd_eng
sp_aero_eng → hub_phd_eng
sp_bio_eng → hub_phd_eng
sp_nuclear_eng → hub_phd_eng
sp_materials_sci → hub_phd_eng
sp_robotics_eng → hub_phd_eng

hub_bs_eng → hub_pe_license
sp_industrial_eng → hub_cert_eng
sp_mfg_eng → hub_cert_eng
sp_civil_eng → hub_cert_eng
```

### Tier 3 → Tier 4: Credential → Career (NEW)

```
hub_bs_eng → car_mech_eng
hub_bs_eng → car_thermal_eng
hub_bs_eng → car_mfg_eng
hub_bs_eng → car_automotive_eng
hub_bs_eng → car_product_dev
hub_bs_eng → car_elec_eng
hub_bs_eng → car_power_eng
hub_bs_eng → car_controls_eng
hub_bs_eng → car_rf_eng
hub_bs_eng → car_ic_designer
hub_bs_eng → car_embedded_eng
hub_bs_eng → car_avionics_eng
hub_ms_eng → car_ic_designer
hub_bs_eng → car_civil_eng
hub_bs_eng → car_struct_eng
hub_bs_eng → car_geotechnical
hub_bs_eng → car_transport_eng
hub_bs_eng → car_water_resources
hub_pe_license → car_struct_eng
hub_pe_license → car_civil_eng
hub_bs_eng → car_chem_eng
hub_bs_eng → car_process_eng
hub_bs_eng → car_process_safety
hub_bs_eng → car_pharma_mfg
hub_bs_eng → car_petroleum_eng
hub_bs_eng → car_aero_eng
hub_bs_eng → car_propulsion_eng
hub_bs_eng → car_flight_test
hub_bs_eng → car_spacecraft_eng
hub_bs_eng → car_guidance_nav
hub_ms_eng → car_guidance_nav
hub_bs_eng → car_bme_eng
hub_bs_eng → car_medical_device
hub_bs_eng → car_clinical_eng
hub_ms_eng → car_imaging_scientist
hub_ms_eng → car_tissue_eng
hub_phd_eng → car_tissue_eng
hub_bs_eng → car_env_eng
hub_bs_eng → car_sustainability
hub_bs_eng → car_remediation
hub_bs_eng → car_water_eng
hub_bs_eng → car_industrial_eng
hub_bs_eng → car_process_imp
hub_bs_eng → car_supply_chain_eng
hub_bs_eng → car_quality_eng
hub_bs_eng → car_systems_eng
hub_ms_eng → car_systems_eng
hub_bs_eng → car_project_eng
hub_cert_eng → car_quality_eng
hub_bs_eng → car_materials_eng
hub_bs_eng → car_metallurgist
hub_bs_eng → car_composites_eng
hub_bs_eng → car_semiconductor
hub_ms_eng → car_semiconductor
hub_bs_eng → car_nuclear_eng
hub_bs_eng → car_radiation_safety
hub_ms_eng → car_fusion_eng
hub_phd_eng → car_fusion_eng
hub_bs_eng → car_robotics_eng
hub_bs_eng → car_mechatronics
hub_ms_eng → car_autonomy_eng
hub_phd_eng → car_autonomy_eng
hub_ms_eng → car_research_eng
hub_phd_eng → car_research_eng
hub_phd_eng → car_professor
hub_bs_eng → car_tech_consultant
hub_ms_eng → car_tech_consultant
```

---

## Notes for Backend Engineers

1. **The taxonomy JS file is the source of truth for node field data** (summary, mastery, hrs, asmt_count). Transcribe it into SQL INSERTs. This document provides the structural specification; the JS file provides the content.

2. **The duplicate `adv_prog_eng`** in the JS file is a bug. Use only the first definition.

3. **Edge functions need environment variables:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally an LLM API key for future AI-generated assessments.

4. **Assessment questions are not yet authored.** The `assessment_questions` table is ready but empty. Initial development should use the "Skip & Mark Complete" flow. Question authoring is a separate workstream.

5. **The `get_prerequisite_tree` function is performance-critical.** For a deeply nested career path (e.g., Tier 4 career), the recursive CTE walks ~5 levels deep across ~40–60 nodes. This should complete in under 50ms on Supabase's Postgres. Add `EXPLAIN ANALYZE` during testing.

6. **Frontend will call the taxonomy endpoints once on app load** and cache the full graph client-side. Only user-specific data (status, career paths, attempts) needs per-session fetching.
