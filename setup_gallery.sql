-- Corre este script en el SQL Editor de Supabase
-- para permitir múltiples imágenes en la galería de los productos.

ALTER TABLE products 
ADD COLUMN gallery_images TEXT[] DEFAULT '{}';
