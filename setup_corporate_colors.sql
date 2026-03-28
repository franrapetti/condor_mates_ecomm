-- Variantes de color
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_group text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_name text;

-- Regalos empresariales
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_corporate boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS corporate_pricing jsonb;
-- Ejemplo de corporate_pricing: [{"min":10,"max":49,"price":8500},{"min":50,"price":7000}]

-- Tabla de leads empresariales (opcional, por ahora vamos por WhatsApp)
-- CREATE TABLE IF NOT EXISTS corporate_leads (
--   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
--   company_name text NOT NULL,
--   contact_name text,
--   phone text,
--   email text,
--   estimated_qty integer,
--   message text,
--   created_at timestamp DEFAULT now()
-- );
