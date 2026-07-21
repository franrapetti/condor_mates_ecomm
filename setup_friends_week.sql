-- Semana del Amigo: add promo flag to products table
-- Run this in Supabase SQL Editor before deploying
-- To clean up after the campaign: UPDATE products SET is_friends_week_promo = false;

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_friends_week_promo BOOLEAN DEFAULT false;
