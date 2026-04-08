-- ============================================================
--  Cóndor Mates — Analytics Overhaul v3
--  Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Columna de visitas completas al detalle del producto
--    (distinta de click_count que sólo cuenta clics en la tarjeta del catálogo)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 0;

-- 2. Vincular cada page_view a un producto específico (para heatmap por producto)
ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL;

-- 3. Índices para consultas rápidas en el dashboard
CREATE INDEX IF NOT EXISTS idx_page_views_created_at  ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_product_id  ON public.page_views (product_id);
CREATE INDEX IF NOT EXISTS idx_page_views_source       ON public.page_views (source);
CREATE INDEX IF NOT EXISTS idx_page_views_session      ON public.page_views (session_id);

-- 4. RPC: incrementar visit_count cuando el usuario abre la página de un producto
CREATE OR REPLACE FUNCTION public.increment_visit_count(p_product_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET visit_count = COALESCE(visit_count, 0) + 1
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Mantener increment_click_count (para clics en tarjetas del catálogo)
CREATE OR REPLACE FUNCTION public.increment_click_count(product_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET click_count = COALESCE(click_count, 0) + 1
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Vista mensual de tráfico (usable desde el dashboard directamente)
CREATE OR REPLACE VIEW public.monthly_page_views AS
SELECT
  DATE_TRUNC('month', created_at)::DATE AS month,
  source,
  COUNT(DISTINCT session_id)            AS unique_sessions,
  COUNT(*)                              AS total_views
FROM public.page_views
GROUP BY month, source
ORDER BY month DESC;

-- 7. Vista mensual de visitas por producto
CREATE OR REPLACE VIEW public.monthly_product_views AS
SELECT
  DATE_TRUNC('month', pv.created_at)::DATE AS month,
  pv.product_id,
  p.name                                   AS product_name,
  COUNT(*)                                 AS views
FROM public.page_views pv
JOIN public.products p ON p.id = pv.product_id
WHERE pv.product_id IS NOT NULL
GROUP BY month, pv.product_id, p.name
ORDER BY month DESC, views DESC;

-- 8. Asegurar políticas RLS (sin duplicar si ya existen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'page_views' AND policyname = 'Permitir select autenticado admin'
  ) THEN
    CREATE POLICY "Permitir select autenticado admin" ON public.page_views
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;
