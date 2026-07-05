-- Correr en el Supabase SQL Editor para implementar la base de carritos abandonados (Leads)

CREATE TABLE IF NOT EXISTS public.abandoned_carts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    cart_data JSONB NOT NULL,
    total NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Permite a cualquiera (público anónimo) INSERTAR y ACTUALIZAR un carrito (usando ON CONFLICT en email)
-- Para esto, permitimos INSERT y UPDATE público temporalmente, o mejor manejarlo del lado del server (API).
-- Si lo hacemos desde la API con el anon key, necesitamos políticas:

CREATE POLICY "Permitir inserción anónima" 
ON public.abandoned_carts FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir update anónimo" 
ON public.abandoned_carts FOR UPDATE 
USING (true)
WITH CHECK (true);
