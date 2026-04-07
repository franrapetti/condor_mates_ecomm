-- SQL Script para crear la tabla de Ventas Manuales (Manual Sales)
-- Asegúrate de ejecutar esto en el SQL Editor de tu Dashboard de Supabase.

CREATE TABLE IF NOT EXISTS public.manual_sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_name TEXT NOT NULL,
    contact TEXT,
    items JSONB NOT NULL,
    total NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.manual_sales ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir acceso solo a administradores / usuarios autenticados
CREATE POLICY "Enable all operations for authenticated admin users" 
ON public.manual_sales FOR ALL USING (auth.role() = 'authenticated');
