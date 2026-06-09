import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('products').select('name, price, image_url, category, stock').eq('is_active', true);
  console.log('Error:', error);
  console.log('Data is null?', data === null);
  console.log('Data length:', data ? data.length : 0);
}
test();
