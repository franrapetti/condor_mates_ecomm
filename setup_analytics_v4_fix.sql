-- ============================================================
--  Cóndor Mates — Analytics Fix v4
--  Ejecutar en el SQL Editor de Supabase
--
--  Corrige:
--    1. Tipo de dato de increment_click_count (UUID → BIGINT)
--    2. Vista monthly_product_views usa LEFT JOIN
--    3. Índice compuesto para dashboard
-- ============================================================

-- 0. Asegurar columnas requeridas existen
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL;

-- 1. FIX: Eliminar la versión UUID de increment_click_count si existe
--    y asegurar que solo quede la versión BIGINT
DROP FUNCTION IF EXISTS public.increment_click_count(UUID);

CREATE OR REPLACE FUNCTION public.increment_click_count(product_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET click_count = COALESCE(click_count, 0) + 1
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FIX: Asegurar increment_visit_count existe con tipo correcto
CREATE OR REPLACE FUNCTION public.increment_visit_count(p_product_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET visit_count = COALESCE(visit_count, 0) + 1
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FIX: Vista mensual de visitas por producto — usar LEFT JOIN
--    para no excluir page_views sin product_id vinculado
CREATE OR REPLACE VIEW public.monthly_product_views AS
SELECT
  DATE_TRUNC('month', pv.created_at)::DATE AS month,
  pv.product_id,
  COALESCE(p.name, '(sin producto)')       AS product_name,
  COUNT(*)                                  AS views
FROM public.page_views pv
LEFT JOIN public.products p ON p.id = pv.product_id
GROUP BY month, pv.product_id, p.name
ORDER BY month DESC, views DESC;

-- 4. Índice compuesto para optimizar queries del dashboard
CREATE INDEX IF NOT EXISTS idx_page_views_path_created
  ON public.page_views (path, created_at DESC);

-- 5. Permisos: Asegurar que las RPC son ejecutables por anon
GRANT EXECUTE ON FUNCTION public.increment_click_count(BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_visit_count(BIGINT) TO anon;

-- 6. RLS: Asegurar que UPDATE anónimo funciona en page_views
--    (necesario para vincular product_id y actualizar duration_seconds)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'page_views' AND policyname = 'Permitir actualizaciones anonimas'
  ) THEN
    CREATE POLICY "Permitir actualizaciones anonimas" ON public.page_views
      FOR UPDATE USING (true);
  END IF;
END $$;

-- 7. FIX CRÍTICO: La SDK de Supabase usa .insert().select().single()
--    que requiere permiso SELECT para devolver el id de la fila insertada.
--    Sin esto, useAnalytics NUNCA recibe el view ID → product_id nunca se vincula.
--    Permitir SELECT anónimo (los datos son anónimos, sin PII sensible).
DO $$
BEGIN
  -- Eliminar la policy vieja que bloquea SELECT para anon
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'page_views' AND policyname = 'Permitir select autenticado admin'
  ) THEN
    DROP POLICY "Permitir select autenticado admin" ON public.page_views;
  END IF;

  -- Crear policy que permite SELECT tanto a anon (para el .select() post-insert)
  -- como a authenticated (para el dashboard admin)
  CREATE POLICY "Permitir select page_views" ON public.page_views
    FOR SELECT USING (true);
END $$;

-- 8. Asegurar permisos de DELETE en page_views y analytics_events para limpieza
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'page_views' AND policyname = 'Permitir delete anonimo'
  ) THEN
    CREATE POLICY "Permitir delete anonimo" ON public.page_views
      FOR DELETE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'analytics_events' AND policyname = 'Permitir delete anonimo'
  ) THEN
    CREATE POLICY "Permitir delete anonimo" ON public.analytics_events
      FOR DELETE USING (true);
  END IF;
END $$;

