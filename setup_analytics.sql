-- Tabla para registrar analíticas de tráfico
CREATE TABLE IF NOT EXISTS public.page_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    path TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar Políticas de Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- 1. Permitir que cualquier visitante (anónimo) registre su visita
CREATE POLICY "Permitir inserciones anonimas" ON public.page_views
    FOR INSERT WITH CHECK (true);

-- 2. Permitir que el visitante actualice el "tiempo de permanencia" al salir
CREATE POLICY "Permitir actualizaciones anonimas" ON public.page_views
    FOR UPDATE USING (true);

-- 3. Solo tú (el dueño autenticado) puedes leer/ver los datos en el Dashboard
CREATE POLICY "Permitir select autenticado admin" ON public.page_views
    FOR SELECT USING (auth.role() = 'authenticated');
