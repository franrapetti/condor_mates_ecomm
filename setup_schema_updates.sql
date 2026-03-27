-- Ejecutá esto en el SQL Editor de tu cuenta de Supabase
-- para habilitar la subida del Formulario de Productos y las nuevas funciones.

-- 1. Agregar la columna de Stock
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INTEGER;

-- 2. Agregar la columna para las imágenes extra de la galería (Array de textos)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery_images TEXT[];
