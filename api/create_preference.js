import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { items, customer, total, source } = req.body;

    // Configurar Supabase Client
    // Usamos variables de entorno universales de Vercel
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Configurar Mercado Pago
    // EL MP_ACCESS_TOKEN debe ser inyectado en Vercel Environment Variables
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || "TEST-TOKEN" });

    // 1. Insertar orden preliminar en Supabase para obtener un UUID unívoco
    const { data: orderData, error: dbError } = await supabase.from('orders').insert([{
      customer_name: customer.name,
      customer_email: customer.email,
      customer_city: customer.city,
      customer_notes: customer.notes || '',
      items: items,
      total_price: total,
      status: 'pending',
      source: source || 'direct'
    }]).select().single();

    if (dbError) throw dbError;

    // 1.5 Validate stock for all items before charging (prevents overselling)
    const productIds = items.map(i => i.id);
    const { data: dbProducts } = await supabase
      .from('products')
      .select('id, name, stock')
      .in('id', productIds);
    
    if (dbProducts) {
      for (const item of items) {
        const dbProduct = dbProducts.find(p => p.id === item.id);
        if (dbProduct && dbProduct.stock !== null && item.quantity > dbProduct.stock) {
          // Cancel the pending order we just created
          await supabase.from('orders').delete().eq('id', orderData.id);
          return res.status(400).json({ 
            error: `Stock insuficiente para "${dbProduct.name}". Solo quedan ${dbProduct.stock} unidades disponibles.` 
          });
        }
      }
    }

    // 2. Crear Preferencia en Mercado Pago
    const preference = new Preference(client);
    const body = {
      items: items.map(item => ({
        id: item.id,
        title: item.name,
        quantity: item.quantity,
        unit_price: Number(item.price),
        currency_id: 'ARS',
      })),
      payer: {
        name: customer.name,
      },
      back_urls: {
        success: `${req.headers.origin}/success`,
        failure: `${req.headers.origin}/`,
        pending: `${req.headers.origin}/`,
      },
      auto_return: 'approved',
      external_reference: orderData.id, // Vincula MP con nuestra DB
      notification_url: `${req.headers.origin}/api/webhook`, // Para Webhooks automáticos
    };

    const response = await preference.create({ body });

    // 3. Actualizar la orden con el preference_id
    await supabase.from('orders').update({ mp_preference_id: response.id }).eq('id', orderData.id);

    return res.status(200).json({ id: response.id });
  } catch (error) {
    console.error('Error creating MP Preference:', error);
    return res.status(500).json({ error: 'Failed to create preference' });
  }
}
