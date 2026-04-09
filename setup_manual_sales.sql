-- SQL Script para recrear la tabla manual_sales con el schema correcto
-- que usa el componente ManualSales.jsx
-- Ejecutar en el SQL Editor de Supabase

-- Eliminar tabla vieja si existe (CUIDADO: borra los datos existentes)
-- Si tenés datos que querés conservar, primero hacé un backup desde Supabase → Table Editor → Export
DROP TABLE IF EXISTS public.manual_sales;

-- Crear tabla con los campos correctos
CREATE TABLE public.manual_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name   TEXT    NOT NULL,
    customer_phone  TEXT,
    items           TEXT    NOT NULL,
    total_amount    NUMERIC NOT NULL,
    payment_method  TEXT    DEFAULT 'Efectivo',
    status          TEXT    DEFAULT 'paid',
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.manual_sales ENABLE ROW LEVEL SECURITY;

-- Solo admins autenticados pueden leer/escribir
CREATE POLICY "Admin full access manual_sales"
ON public.manual_sales FOR ALL USING (auth.role() = 'authenticated');
