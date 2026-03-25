-- Agregar soporte para Emails y Rastreo UTM a la tabla de órdenes
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';

-- Agregar soporte para Rastreo UTM a las visitas
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
