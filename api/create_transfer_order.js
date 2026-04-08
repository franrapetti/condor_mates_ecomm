import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { items, customer, total, source } = req.body;

    // Configurar Supabase Client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate stock
    const productIds = items.map(i => i.id);
    const { data: dbProducts } = await supabase
      .from('products')
      .select('id, name, stock')
      .in('id', productIds);
    
    if (dbProducts) {
      for (const item of items) {
        const dbProduct = dbProducts.find(p => p.id === item.id);
        if (dbProduct && dbProduct.stock !== null && item.quantity > dbProduct.stock) {
          return res.status(400).json({ 
            error: `Stock insuficiente para "${dbProduct.name}". Solo quedan ${dbProduct.stock} unidades disponibles.` 
          });
        }
      }
    }

    // Insertar orden
    const { data: orderData, error: dbError } = await supabase.from('orders').insert([{
      customer_name: customer.name,
      customer_email: customer.email,
      customer_city: customer.city,
      customer_notes: customer.notes || '',
      items: items,
      total_price: total,
      status: 'pending_transfer',
      source: source || 'direct'
    }]).select().single();

    if (dbError) throw dbError;

    // Reducir stock inmediatamente ya que es transferencia y reservan
    if (dbProducts) {
      for (const item of items) {
        const dbProduct = dbProducts.find(p => p.id === item.id);
        if (dbProduct && dbProduct.stock !== null) {
          await supabase.from('products').update({ stock: Math.max(0, dbProduct.stock - item.quantity) }).eq('id', item.id);
        }
      }
    }

    // Notificar al CallMeBot
    const phone = process.env.VITE_CALLMEBOT_PHONE;
    const apikey = process.env.VITE_CALLMEBOT_APIKEY;
    if (phone && apikey) {
      let itemSummary = items.map(item => `- ${item.name} x${item.quantity}`).join('\n');
      const message = `🔔 *Nuevo Pedido (Transferencia)* 🧉\n\n*N° Operación:* ${orderData.id.slice(0,8)}...\n*Nombre:* ${customer.name}\n*Productos:*\n${itemSummary}\n\n*Total:* $${total.toLocaleString()}\n\n🚀 ¡Esperando comprobante de pago!`;
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`;
      try {
        await fetch(url);
      } catch (e) {
        console.error('CallMeBot error', e);
      }
    }

    return res.status(200).json({ id: orderData.id });
  } catch (error) {
    console.error('Error creating transfer order:', error);
    return res.status(500).json({ error: 'Failed to create transfer order' });
  }
}
