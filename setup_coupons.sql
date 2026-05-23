-- ============================================================
--  Cóndor Mates — Sistema de Cupones Dinámicos
--  Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Tabla de cupones
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL,
    min_purchase_amount NUMERIC DEFAULT 0,
    max_uses INTEGER DEFAULT NULL,
    used_count INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    applicable_category VARCHAR(100) DEFAULT NULL,
    applicable_product_filter TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 3. Política pública de lectura (solo cupones activos y no expirados)
CREATE POLICY "Permitir select público de cupones activos" ON public.coupons
    FOR SELECT USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- 4. Política de administración completa para usuarios autenticados
CREATE POLICY "Permitir CRUD admin autenticado" ON public.coupons
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. Función para incrementar el uso de un cupón (llamada desde el webhook)
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_code TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Insertar el cupón existente CONDOR10 como migración
INSERT INTO public.coupons (code, discount_type, discount_value, applicable_product_filter, active)
VALUES ('CONDOR10', 'percentage', 10, 'imperial%alpaca', true)
ON CONFLICT (code) DO NOTHING;
