import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, name, phone, cartData, total } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido.' });

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Guardar en abandoned_carts
    const { error: abandonedError } = await supabase
      .from('abandoned_carts')
      .upsert({
        email: email.trim(),
        name: name || null,
        phone: phone || null,
        cart_data: cartData || {},
        total: total || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (abandonedError) {
      console.error('Error guardando abandoned cart:', abandonedError);
      
      // Fallback a tabla leads si abandoned_carts no existe todavía
      await supabase.from('leads').upsert({
        email: email.trim(),
        source: 'abandoned_cart'
      }, { onConflict: 'email' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error in save_cart_lead:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
