-- Run this in your Supabase SQL Editor to add promotional price support
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price numeric;

-- Optional: set a promo price on a specific product to test
-- UPDATE products SET promo_price = 9500 WHERE name = 'Tu Producto';
