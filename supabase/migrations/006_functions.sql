CREATE OR REPLACE FUNCTION get_prerequisite_tree(target_id TEXT)
RETURNS TABLE (
  node_id   TEXT,
  edge_from TEXT,
  edge_to   TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    SELECT target_id AS nid, NULL::TEXT AS efrom, NULL::TEXT AS eto
    UNION
    SELECT e.from_id, e.from_id, e.to_id
    FROM skill_edges e
    INNER JOIN ancestors a ON e.to_id = a.nid
  )
  SELECT DISTINCT a.nid, a.efrom, a.eto
  FROM ancestors a;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_career_path_with_progress(
  p_user_id  UUID,
  p_target_id TEXT
)
RETURNS TABLE (
  node_id   TEXT,
  node_name TEXT,
  tier      INT,
  cat       TEXT,
  hrs       INT,
  status    skill_status,
  edge_from TEXT,
  edge_to   TEXT
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


CREATE OR REPLACE FUNCTION mark_skill_complete(
  p_user_id  UUID,
  p_skill_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  unmet_count INT;
BEGIN
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

  INSERT INTO user_skill_status (user_id, skill_id, status, completed_at)
  VALUES (p_user_id, p_skill_id, 'mastered', now())
  ON CONFLICT (user_id, skill_id) DO UPDATE SET
    status = 'mastered',
    completed_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_path_complete(
  p_user_id  UUID,
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

CREATE OR REPLACE FUNCTION check_prerequisites_met(
  p_user_id  UUID,
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
