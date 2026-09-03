-- ============================================
-- Presupuestador Mayorista — Cóndor Mates
-- Tabla: wholesale_budgets
-- ============================================

CREATE TABLE IF NOT EXISTS wholesale_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  budget_name TEXT,

  -- Datos del cliente (opcionales)
  client_name TEXT DEFAULT '',
  client_business TEXT DEFAULT '',
  client_cuit TEXT DEFAULT '',
  client_phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',

  -- Items del presupuesto (JSON array)
  -- [{product_id, name, quantity, unit_price, subtotal}]
  items JSONB DEFAULT '[]',

  -- Totales calculados
  subtotal NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  packaging NUMERIC DEFAULT 0,
  shipping NUMERIC DEFAULT 0,
  total_without_commission NUMERIC DEFAULT 0,

  -- Comisiones
  commission_type TEXT DEFAULT '',
  commission_rate NUMERIC DEFAULT 0,
  installments TEXT DEFAULT 'none',
  total_with_commission NUMERIC DEFAULT 0
);

-- Habilitar RLS
ALTER TABLE wholesale_budgets ENABLE ROW LEVEL SECURITY;

-- Política permisiva para usuarios autenticados
CREATE POLICY "Allow all for authenticated users" ON wholesale_budgets
  FOR ALL
  USING (true)
  WITH CHECK (true);
