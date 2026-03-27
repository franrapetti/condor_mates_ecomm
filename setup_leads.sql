-- Correr en el Supabase SQL Editor para implementar la base de contactos (Leads)

-- 1. Crear la tabla de leads
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS (Seguridad)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
-- Permite a cualquiera (público anónimo) INSERTAR un nuevo email
CREATE POLICY "Permitir inserción pública anónima de leads" 
ON public.leads FOR INSERT 
WITH CHECK (true);

-- NO hay política de SELECT pública, los emails capturados solo podrá verlos el Administrador
-- (Asegurate de que tu usuario autenticado o admin tenga permisos para ver todos los datos)
