-- Ejecutalo en el Supabase SQL Editor para habilitar los nuevos botones del Panel

-- 1. Añadimos el botón toggle de si Mostrar la etiqueta de Últimas Unidades
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS show_stock_alert BOOLEAN DEFAULT false;

-- 2. Añadimos el botón toggle de si el producto es Prioridad en el Catálogo (Destacado)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;
