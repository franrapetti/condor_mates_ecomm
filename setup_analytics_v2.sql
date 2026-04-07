-- Parche SQL: Analíticas y Tracking de Clics
-- ¡Asegúrate de correr esto en el SQL Editor de Supabase para arreglar el contador de clics y fuentes!

-- 1. Añadir columna 'source' para rastrear de dónde vienen los usuarios (Instagram, Facebook, etc).
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';

-- 2. Asegurar que los productos tienen una columna para contar clics.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- 3. Crear el procedimiento almacenado (RPC) exacto que usa React para sumar +1 clic en tiempo real.
CREATE OR REPLACE FUNCTION public.increment_click_count(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET click_count = COALESCE(click_count, 0) + 1
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
