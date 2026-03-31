-- 1. Agregar la columna de contabilidad de ventas (si no existe)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sold_count INTEGER DEFAULT 0;

-- 2. Crear una función (trigger) que se ejecute cuando un pedido se cambie a 'paid'
CREATE OR REPLACE FUNCTION update_product_sold_count()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- Only act if the status changes TO 'paid' (or if inserted directly as 'paid')
    IF (TG_OP = 'INSERT' AND NEW.status = 'paid') OR
       (TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status != 'paid') THEN
       
       -- NEW.items is expected to be a JSONB array, e.g. [{"id": "uuid", "quantity": 1}]
       FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
       LOOP
           UPDATE public.products
           SET sold_count = COALESCE(sold_count, 0) + (item.value->>'quantity')::int
           WHERE id = (item.value->>'id')::uuid;
       END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Asignar el trigger a la tabla orders
DROP TRIGGER IF EXISTS trg_update_sold_count ON public.orders;
CREATE TRIGGER trg_update_sold_count
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION update_product_sold_count();
