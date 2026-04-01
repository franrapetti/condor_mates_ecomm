import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { notifyNewOrder } from '../../lib/notifications';

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const { clearCart } = useCart();
  
  const [lastCart, setLastCart] = useState([]);
  const [lastTotal, setLastTotal] = useState(0);

  useEffect(() => {
    // Recover cart snapshot from sessionStorage
    let savedCart = [];
    let savedTotal = 0;
    try {
      const savedCartRaw = sessionStorage.getItem('mate_last_cart');
      const savedTotalRaw = sessionStorage.getItem('mate_last_total');
      if (savedCartRaw) savedCart = JSON.parse(savedCartRaw);
      if (savedTotalRaw) savedTotal = parseFloat(savedTotalRaw);
      setLastCart(savedCart);
      setLastTotal(savedTotal);
    } catch (e) {
      // Ignore parse errors
    }

    // Clear cart after successful payment and Notify Admin
    if (status === 'approved') {
      clearCart();
      
      // Send WhatsApp Notification (Once per session/payment)
      const notifiedKey = `notified_${paymentId}`;
      if (paymentId && !sessionStorage.getItem(notifiedKey)) {
        notifyNewOrder({ paymentId, items: savedCart, total: savedTotal });
        sessionStorage.setItem(notifiedKey, 'true');
      }

      if (window.fbq && paymentId) {
        window.fbq('track', 'Purchase', { currency: 'ARS', transaction_id: paymentId });
      }
    }
  }, [status, paymentId, clearCart]);

  const isApproved = status === 'approved';

  return (
    <div className="checkout-success-page fade-in">
      <Helmet>
        <title>{isApproved ? '¡Pago Exitoso!' : 'Pago pendiente'} | Cóndor Mates</title>
      </Helmet>

      <div className="success-card">
        <div className="success-icon">{isApproved ? '🧉' : '⏳'}</div>
        <h1>{isApproved ? '¡Muchas gracias!' : 'Pago en proceso...'}</h1>
        <p>
          {isApproved
            ? 'Tu pago fue confirmado y tu pedido ya está en nuestro sistema. ¡Vamos a prepararlo enseguida!'
            : 'Tu pago está siendo procesado. En breve recibirás la confirmación por email.'}
        </p>

        {/* Cart Summary */}
        {lastCart.length > 0 && (
          <div className="success-items">
            <h3 className="success-items-title">📦 Tu pedido</h3>
            <ul className="success-items-list">
              {lastCart.map((item, i) => (
                <li key={i} className="success-item">
                  <img src={item.image_url} alt={item.name} className="success-item-img" />
                  <div className="success-item-details">
                    <span className="success-item-name">{item.name}</span>
                    <span className="success-item-qty">x{item.quantity}</span>
                  </div>
                  <span className="success-item-price">${(item.price * item.quantity).toLocaleString()}</span>
                </li>
              ))}
            </ul>
            <div className="success-total">
              <span>Total cobrado</span>
              <strong>${lastTotal.toLocaleString()}</strong>
            </div>
          </div>
        )}

        {paymentId && (
          <div className="order-details">
            <p className="order-number">N° de Operación: <strong>{paymentId}</strong></p>
            <p className="order-instructions">Guardá este número para cualquier consulta.</p>
          </div>
        )}

        <div className="success-actions">
          <Link to="/" className="btn-primary success-btn">🛍️ Seguir comprando</Link>
          <a
            href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '543572595756'}?text=${encodeURIComponent('¡Hola! Acabo de hacer una compra por la web. Quería confirmar el pedido.')}`}
            className="success-whatsapp-btn"
            target="_blank"
            rel="noreferrer"
          >
            💬 Consultar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
