/**
 * Envia una notificación por WhatsApp usando el servicio de CallMeBot.
 * @param {string} message - El mensaje a enviar. Debe estar codificado para URL.
 */
export const sendWhatsAppNotification = async (message) => {
  const phone = import.meta.env.VITE_CALLMEBOT_PHONE;
  const apikey = import.meta.env.VITE_CALLMEBOT_APIKEY;

  if (!phone || !apikey) {
    console.warn('CallMeBot: Phone or APIKey not configured in .env');
    return;
  }

  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`;
    
    // Usamos mode: 'no-cors' porque CallMeBot a veces no tiene cabeceras CORS correctas
    // pero el GET funciona igual para disparar el mensaje.
    await fetch(url, { mode: 'no-cors' });
    console.log('CallMeBot: Notificación enviada con éxito');
  } catch (error) {
    console.error('CallMeBot error:', error);
  }
};

/**
 * Formatea un pedido para ser enviado por WhatsApp.
 * @param {Object} orderData - Datos del pedido (items, total, id).
 */
export const notifyNewOrder = async (orderData) => {
  const { paymentId, items, total } = orderData;
  
  let itemSummary = items.map(item => `- ${item.name} x${item.quantity}`).join('\n');
  
  const message = `🔔 *Nuevo Pedido Recibido* 🧉\n\n` +
                  `*N° Operación:* ${paymentId}\n` +
                  `*Productos:*\n${itemSummary}\n\n` +
                  `*Total:* $${total.toLocaleString()}\n\n` +
                  `🚀 ¡Revisá el panel de administración para más detalles!`;

  await sendWhatsAppNotification(message);
};
