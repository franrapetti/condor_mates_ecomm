import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

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
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
