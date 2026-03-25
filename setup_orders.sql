-- Run this script in your Supabase SQL Editor

-- 1. Create the orders table
CREATE TABLE public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_city TEXT NOT NULL,
    customer_notes TEXT,
    items JSONB NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'paid', 'shipped', 'cancelled'
    mp_preference_id TEXT,
    mp_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Setup Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert an order (when they initiate checkout)
CREATE POLICY "Anyone can create an order" 
ON public.orders FOR INSERT 
WITH CHECK (true);

-- Allow authenticated admins to view/update all orders
CREATE POLICY "Admins can view and edit orders" 
ON public.orders FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');
