import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { type, 'data.id': dataId } = req.query;
    
    // MP envía un evento notification
    if (type === 'payment' || req.query.topic === 'payment') {
      const paymentId = dataId || req.body?.data?.id;
      
      if (!paymentId) return res.status(400).send('No payment id');

      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || "TEST-TOKEN" });
      const paymentClient = new Payment(client);
      
      const paymentData = await paymentClient.get({ id: paymentId });
      
      // Si el pago está aprobado, actualizamos Supabase
      if (paymentData.status === 'approved') {
        const orderId = paymentData.external_reference;
        
        if (orderId) {
          const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
          // IMPORTANT: Requerimos la clave SERVICE ROLE KEY para poder sobreescribir el RLS
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
          const supabase = createClient(supabaseUrl, supabaseKey);

          await supabase.from('orders').update({ 
            status: 'paid',
            mp_payment_id: paymentId
          }).eq('id', orderId);

          // Get the full order to send Automated Email
          const { data: fullOrder } = await supabase.from('orders').select('*').eq('id', orderId).single();
          const resendKey = process.env.RESEND_API_KEY;
          
          if (resendKey && fullOrder && fullOrder.customer_email) {
            const resend = new Resend(resendKey);
            try {
              await resend.emails.send({
                from: 'Cóndor Mates <onboarding@resend.dev>', // Resend sandbox requirement to test
                to: fullOrder.customer_email,
                subject: '¡Pago Confirmado! Estamos preparando tu pedido 🧉',
                html: `
                  <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaec; border-radius: 8px;">
                    <h2 style="color: #234a2e; text-align: center;">¡Gracias por tu compra, ${fullOrder.customer_name}!</h2>
                    <p style="font-size: 16px; color: #444;">Tu pago de <strong>$${fullOrder.total_price.toLocaleString()}</strong> por Mercado Pago se ha procesado con éxito.</p>
                    <p style="font-size: 16px; color: #444;">Ya nos encontramos empacando tus mates para enviarlos a <strong>${fullOrder.customer_city}</strong>.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                      <h4 style="margin-top: 0; color: #234a2e;">Detalles del pedido:</h4>
                      <ul style="color: #555; line-height: 1.6;">
                        ${fullOrder.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}
                      </ul>
                    </div>
                    <p style="font-size: 16px; color: #444;">Te contactaremos pronto con el código de seguimiento de Andreani.</p>
                    <p style="text-align: center; font-size: 14px; color: #888; margin-top: 30px;">El equipo de Cóndor Mates 🦅</p>
                  </div>
                `
              });
              console.log('Automated confirmation email sent to', fullOrder.customer_email);
            } catch (emailError) {
              console.error('Failed to send Resend email:', emailError);
            }

            // Reducir stock de productos
            for (const item of fullOrder.items) {
              const { data: dbProduct } = await supabase.from('products').select('stock').eq('id', item.id).single();
              if (dbProduct && dbProduct.stock !== null) {
                await supabase.from('products').update({ stock: Math.max(0, dbProduct.stock - item.quantity) }).eq('id', item.id);
              }
            }

            // Notificación vía CallMeBot
            const phone = process.env.VITE_CALLMEBOT_PHONE;
            const apikey = process.env.VITE_CALLMEBOT_APIKEY;
            if (phone && apikey) {
              let itemSummary = fullOrder.items.map(item => `- ${item.name} x${item.quantity}`).join('\n');
              const message = `🔔 *Pedido Pagado (Mercado Pago)* 🧉\n\n*N° Operación:* ${paymentId}\n*Cliente:* ${fullOrder.customer_name}\n*Productos:*\n${itemSummary}\n\n*Total:* $${fullOrder.total_price.toLocaleString()}\n\n🚀 ¡Listo para despachar!`;
              const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`;
              try {
                await fetch(url);
              } catch (e) {
                console.error('CallMeBot notification error:', e);
              }
            }
          }
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
