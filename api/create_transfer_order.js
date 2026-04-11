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

    // Notificar al CallMeBot (WhatsApp) con super logs para diagnóstico
    const phone = process.env.VITE_CALLMEBOT_PHONE;
    const apikey = process.env.VITE_CALLMEBOT_APIKEY;

    console.log(`[Bot Debug] Intentando enviar WhatsApp a: ${phone ? phone.slice(0, 7) + '...' : 'MISSING'}`);
    
    if (phone && apikey) {
      // Limpiar el número de teléfono (solo dejar números y el + inicial si existe)
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      const itemSummary = items.map(item => `- ${item.name} x${item.quantity}`).join('\n');
      const message = `🔔 *Nuevo Pedido (Transferencia)* 🧉\n\n*N° Operación:* ${orderData.id.slice(0,8)}...\n*Nombre:* ${customer.name}\n*Productos:*\n${itemSummary}\n\n*Total:* $ ${total.toLocaleString('es-AR')}\n\n🚀 ¡Esperando comprobante de pago!`;
      
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`;
      
      try {
        const botResponse = await fetch(url);
        const botText = await botResponse.text();
        console.log(`[CallMeBot Result] Status: ${botResponse.status}, Response: ${botText}`);
        
        if (!botResponse.ok) {
          console.warn(`[CallMeBot Warning] El bot devolvió un error: ${botText}`);
        }
      } catch (e) {
        console.error('[CallMeBot Fatal Error] Falló la petición fetch:', e.message);
      }
    } else {
      console.error('[Bot Error] Faltan variables de entorno: VITE_CALLMEBOT_PHONE o VITE_CALLMEBOT_APIKEY');
    }

    return res.status(200).json({ id: orderData.id });
  } catch (error) {
    console.error('Error creating transfer order:', error);
    return res.status(500).json({ error: 'Failed to create transfer order' });
  }
}
