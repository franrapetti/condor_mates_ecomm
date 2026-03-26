-- Correr en el Supabase SQL Editor para implementar el sistema de Reseñas

-- 1. Crear la tabla de reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS (Seguridad)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Permite a cualquiera (público) LEER las reseñas
CREATE POLICY "Permitir lectura publica de reseñas" 
ON public.reviews FOR SELECT 
USING (true);

-- Permite a cualquiera (público) INSERTAR reseñas (puedes restringirlo despues si tienes auth)
CREATE POLICY "Permitir insersión publica anonima de reseñas" 
ON public.reviews FOR INSERT 
WITH CHECK (true);

-- 3. Crear una vista para obtener los productos junto con su rating promedio
-- Esto evita consultar las reseñas archivo por archivo en el catálogo
CREATE OR REPLACE VIEW products_with_rating AS 
SELECT 
    p.*,
    COALESCE(AVG(r.rating), 0) AS rating_avg,
    COUNT(r.id) AS review_count
FROM 
    public.products p
LEFT JOIN 
    public.reviews r ON p.id = r.product_id
GROUP BY 
    p.id;
