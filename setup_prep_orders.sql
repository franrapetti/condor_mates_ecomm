-- ============================================================
-- Tabla: prep_orders (Pedidos a Preparar)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

CREATE TABLE public.prep_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID NOT NULL,
    sale_type TEXT DEFAULT 'manual' NOT NULL,
    customer_name TEXT,
    items TEXT NOT NULL,
    total_amount NUMERIC,
    status TEXT DEFAULT 'pending' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.prep_orders ENABLE ROW LEVEL SECURITY;

-- Solo admins autenticados pueden leer/escribir
CREATE POLICY "Admin full access prep_orders"
ON public.prep_orders FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Índice para búsqueda rápida por sale_id (usado al eliminar ventas)
CREATE INDEX idx_prep_orders_sale_id ON public.prep_orders(sale_id);

-- Índice para filtrar por status (pending vs shipped)
CREATE INDEX idx_prep_orders_status ON public.prep_orders(status);
