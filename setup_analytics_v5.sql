-- ============================================================================
-- Cóndor Mates — Analytics v5
-- Server-side aggregation + Security hardening
--
-- What this migration does:
--   1. Creates RPC `get_analytics_summary(p_days)` — returns a single JSON
--      object with total views, unique sessions, avg duration, sources,
--      daily views, monthly views (Spanish labels), and top pages.
--   2. Creates RPC `get_funnel_summary(p_days)` — returns a JSON array with
--      unique session counts per funnel event from `analytics_events`.
--   3. Hardens RLS on `page_views` and `analytics_events`:
--      - Drops overly permissive DELETE policies for `anon`.
--      - Adds DELETE restricted to `authenticated` role only.
--      - Keeps INSERT for anon (tracking) and SELECT for all.
--   4. Grants EXECUTE on both RPCs to `anon` and `authenticated`.
--
-- Idempotent: safe to run multiple times (CREATE OR REPLACE, DROP IF EXISTS).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. RPC: get_analytics_summary
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_summary(p_days INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  _since TIMESTAMPTZ;
  _result JSONB;
BEGIN
  -- When p_days is 0 or NULL, return all-time data (no lower bound).
  IF p_days IS NULL OR p_days = 0 THEN
    _since := '-infinity'::TIMESTAMPTZ;
  ELSE
    _since := now() - (p_days || ' days')::INTERVAL;
  END IF;

  SELECT jsonb_build_object(
    -- Total page views
    'total_views', (
      SELECT COALESCE(COUNT(*), 0)
      FROM public.page_views
      WHERE created_at >= _since
    ),

    -- Unique sessions
    'unique_sessions', (
      SELECT COALESCE(COUNT(DISTINCT session_id), 0)
      FROM public.page_views
      WHERE created_at >= _since
    ),

    -- Average duration (excluding zeros and NULLs)
    'avg_duration', (
      SELECT COALESCE(ROUND(AVG(duration_seconds)), 0)
      FROM public.page_views
      WHERE created_at >= _since
        AND duration_seconds IS NOT NULL
        AND duration_seconds > 0
    ),

    -- Views grouped by traffic source
    'sources', (
      SELECT COALESCE(jsonb_agg(row_to_json(s)::JSONB), '[]'::JSONB)
      FROM (
        SELECT source, COUNT(*) AS views
        FROM public.page_views
        WHERE created_at >= _since
        GROUP BY source
        ORDER BY views DESC
      ) s
    ),

    -- Daily views & unique sessions
    'daily_views', (
      SELECT COALESCE(jsonb_agg(row_to_json(d)::JSONB ORDER BY d.date), '[]'::JSONB)
      FROM (
        SELECT
          created_at::DATE AS date,
          COUNT(*)         AS views,
          COUNT(DISTINCT session_id) AS sessions
        FROM public.page_views
        WHERE created_at >= _since
        GROUP BY created_at::DATE
      ) d
    ),

    -- Monthly views with Spanish month labels
    'monthly_views', (
      SELECT COALESCE(jsonb_agg(row_to_json(m)::JSONB ORDER BY m.month), '[]'::JSONB)
      FROM (
        SELECT
          TO_CHAR(created_at, 'YYYY-MM') AS month,
          (
            CASE EXTRACT(MONTH FROM created_at)
              WHEN  1 THEN 'Ene'
              WHEN  2 THEN 'Feb'
              WHEN  3 THEN 'Mar'
              WHEN  4 THEN 'Abr'
              WHEN  5 THEN 'May'
              WHEN  6 THEN 'Jun'
              WHEN  7 THEN 'Jul'
              WHEN  8 THEN 'Ago'
              WHEN  9 THEN 'Sep'
              WHEN 10 THEN 'Oct'
              WHEN 11 THEN 'Nov'
              WHEN 12 THEN 'Dic'
            END
            || ' ' || EXTRACT(YEAR FROM created_at)::TEXT
          ) AS label,
          COUNT(*)                       AS views,
          COUNT(DISTINCT session_id)     AS sessions
        FROM public.page_views
        WHERE created_at >= _since
        GROUP BY month, label
      ) m
    ),

    -- Top pages by view count (max 20)
    'top_pages', (
      SELECT COALESCE(jsonb_agg(row_to_json(tp)::JSONB), '[]'::JSONB)
      FROM (
        SELECT path, COUNT(*) AS views
        FROM public.page_views
        WHERE created_at >= _since
        GROUP BY path
        ORDER BY views DESC
        LIMIT 20
      ) tp
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

COMMENT ON FUNCTION public.get_analytics_summary(INT) IS
  'Returns a pre-aggregated JSON analytics summary for the last N days. Pass 0 or NULL for all-time data.';


-- --------------------------------------------------------------------------
-- 2. RPC: get_funnel_summary
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_funnel_summary(p_days INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  _since TIMESTAMPTZ;
  _result JSONB;
BEGIN
  IF p_days IS NULL OR p_days = 0 THEN
    _since := '-infinity'::TIMESTAMPTZ;
  ELSE
    _since := now() - (p_days || ' days')::INTERVAL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(row_to_json(f)::JSONB),
    '[]'::JSONB
  )
  INTO _result
  FROM (
    SELECT
      event_name,
      COUNT(DISTINCT session_id) AS unique_sessions
    FROM public.analytics_events
    WHERE created_at >= _since
    GROUP BY event_name
    ORDER BY unique_sessions DESC
  ) f;

  RETURN _result;
END;
$$;

COMMENT ON FUNCTION public.get_funnel_summary(INT) IS
  'Returns a JSON array of funnel steps with unique session counts from analytics_events.';


-- --------------------------------------------------------------------------
-- 3. RLS Policy Hardening
-- --------------------------------------------------------------------------

-- 3a. page_views ----------------------------------------------------------

-- Drop the overly permissive DELETE policy for anon (if it exists).
DROP POLICY IF EXISTS "Allow anon to delete page_views"   ON public.page_views;
DROP POLICY IF EXISTS "anon_delete_page_views"             ON public.page_views;
DROP POLICY IF EXISTS "Allow anonymous delete"             ON public.page_views;

-- INSERT for anon — needed so the tracker can record page views.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'page_views'
      AND policyname = 'anon_insert_page_views'
  ) THEN
    CREATE POLICY anon_insert_page_views ON public.page_views
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- SELECT for all roles — needed for .insert().select().single() pattern.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'page_views'
      AND policyname = 'select_page_views'
  ) THEN
    CREATE POLICY select_page_views ON public.page_views
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- UPDATE for anon — ideally should be restricted to the caller's own
-- session_id, but Supabase anon requests don't carry a trusted session
-- identifier. Keeping this open for now so the client can update
-- duration_seconds on the row it just inserted.
-- TODO: Restrict once a session-auth mechanism is in place.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'page_views'
      AND policyname = 'anon_update_page_views'
  ) THEN
    CREATE POLICY anon_update_page_views ON public.page_views
      FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- DELETE restricted to authenticated users only (admin cleanup).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'page_views'
      AND policyname = 'authenticated_delete_page_views'
  ) THEN
    CREATE POLICY authenticated_delete_page_views ON public.page_views
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 3b. analytics_events ----------------------------------------------------

-- Drop the overly permissive DELETE policy for anon (if it exists).
DROP POLICY IF EXISTS "Allow anon to delete analytics_events"   ON public.analytics_events;
DROP POLICY IF EXISTS "anon_delete_analytics_events"             ON public.analytics_events;
DROP POLICY IF EXISTS "Allow anonymous delete"                   ON public.analytics_events;

-- INSERT for anon — tracking events from the frontend.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'analytics_events'
      AND policyname = 'anon_insert_analytics_events'
  ) THEN
    CREATE POLICY anon_insert_analytics_events ON public.analytics_events
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- SELECT for all roles.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'analytics_events'
      AND policyname = 'select_analytics_events'
  ) THEN
    CREATE POLICY select_analytics_events ON public.analytics_events
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- DELETE restricted to authenticated users only (admin cleanup).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'analytics_events'
      AND policyname = 'authenticated_delete_analytics_events'
  ) THEN
    CREATE POLICY authenticated_delete_analytics_events ON public.analytics_events
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;


-- --------------------------------------------------------------------------
-- 4. Grant EXECUTE on RPCs to anon & authenticated
-- --------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_analytics_summary(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_funnel_summary(INT)    TO anon, authenticated;


-- ============================================================================
-- Done — Analytics v5 applied.
-- ============================================================================
