-- supabase/migrations/009_add_degree_level.sql
ALTER TABLE skill_nodes ADD COLUMN IF NOT EXISTS degree_level TEXT;

-- Populate known MS-level nodes
UPDATE skill_nodes SET degree_level = 'ms'
WHERE id IN (
  'car_ic_designer','car_guidance_nav','car_imaging_scientist',
  'car_systems_eng','car_semiconductor','car_research_eng'
);

-- Populate known PhD-level nodes
UPDATE skill_nodes SET degree_level = 'phd'
WHERE id IN (
  'car_tissue_eng','car_fusion_eng','car_autonomy_eng','car_professor'
);

-- All remaining tier-3 nodes default to BSc
UPDATE skill_nodes SET degree_level = 'bs'
WHERE tier = 3 AND degree_level IS NULL;
