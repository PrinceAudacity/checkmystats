ALTER TABLE skill_nodes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_edges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_status        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_career_paths        ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_paths              ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read nodes"
  ON skill_nodes FOR SELECT USING (true);

CREATE POLICY "Anyone can read edges"
  ON skill_edges FOR SELECT USING (true);

CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Anyone can read questions"
  ON assessment_questions FOR SELECT USING (true);

CREATE POLICY "Anyone can read saved paths"
  ON saved_paths FOR SELECT USING (true);

CREATE POLICY "Anyone can create saved paths"
  ON saved_paths FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete saved paths"
  ON saved_paths FOR DELETE USING (true);

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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

CREATE POLICY "Users can read own paths"
  ON user_career_paths FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paths"
  ON user_career_paths FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own paths"
  ON user_career_paths FOR DELETE
  USING (auth.uid() = user_id);

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
