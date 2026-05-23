-- ============================================================
--  Cóndor Mates — Analytics Events (Funnel Tracking)
--  Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Tabla de eventos analíticos
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_name VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_events_name ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_session ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.analytics_events (created_at DESC);

-- 3. Habilitar RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 4. Permitir inserción pública anónima (los eventos se envían desde el frontend)
CREATE POLICY "Permitir inserción pública de eventos" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

-- 5. Permitir lectura solo a usuarios autenticados (admin dashboard)
CREATE POLICY "Permitir select autenticado para eventos" ON public.analytics_events
    FOR SELECT USING (auth.role() = 'authenticated');

-- 6. Vista para resumen del embudo por período
CREATE OR REPLACE VIEW public.funnel_summary AS
SELECT
    event_name,
    COUNT(DISTINCT session_id) AS unique_sessions,
    COUNT(*) AS total_events
FROM public.analytics_events
GROUP BY event_name
ORDER BY
    CASE event_name
        WHEN 'view_catalog' THEN 1
        WHEN 'view_product' THEN 2
        WHEN 'add_to_cart' THEN 3
        WHEN 'initiate_checkout' THEN 4
        WHEN 'purchase' THEN 5
        ELSE 6
    END;
