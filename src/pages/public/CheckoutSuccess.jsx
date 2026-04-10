import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { notifyNewOrder } from '../../lib/notifications';
import { useCart } from '../../context/CartContext';
import { Helmet } from 'react-helmet-async';

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

    // Clear cart after successful payment
    if (status === 'approved') {
      clearCart();
      
      if (window.fbq && paymentId) {
        window.fbq('track', 'Purchase', { currency: 'ARS', transaction_id: paymentId });
      }
    }
  }, [status, paymentId, clearCart]);

  const method = searchParams.get('method');
  const isTransfer = method === 'transfer';
  const isApproved = status === 'approved';

  return (
    <div className="checkout-success-page fade-in">
      <Helmet>
        <title>{isApproved ? '¡Pago Exitoso!' : 'Pago pendiente'} | Cóndor Mates</title>
      </Helmet>

      <div className="success-card">
        <div className="success-icon">{isApproved ? '🧉' : '⏳'}</div>
        <h1>{isApproved ? '¡Muchas gracias por tu compra!' : 'Pago en proceso...'}</h1>
        <p>
          {isApproved
            ? isTransfer 
              ? 'Tu pedido está reservado. Solo falta que confirmes la transferencia para coordinar el envío.'
              : 'Tu pago fue confirmado y tu pedido está en nuestro sistema. ¡Vamos a prepararlo enseguida!'
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

        {isTransfer && isApproved && (
          <div className="transfer-details" style={{ backgroundColor: '#f2f8ea', border: '1px solid #cce5b5', padding: '1.5rem', borderRadius: '12px', margin: '1rem 0', textAlign: 'left' }}>
            <h3 style={{ color: '#2b5434', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏦 Datos de Transferencia
            </h3>
            <p><strong>Alias:</strong> CONDOR.MATES</p>
            <p><strong>CBU/CVU:</strong> 0000003100086202495818</p>
            <p><strong>Titular:</strong> Cóndor Mates</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#555' }}>Por favor transferí el monto exacto de <strong>${lastTotal.toLocaleString()}</strong> y enviá el comprobante por WhatsApp presionando el botón debajo.</p>
          </div>
        )}

        {paymentId && !isTransfer && (
          <div className="order-details">
            <p className="order-number">N° de Operación: <strong>{paymentId}</strong></p>
            <p className="order-instructions">Guardá este número para cualquier consulta.</p>
          </div>
        )}

        <div className="success-actions">
          <Link to="/" className="btn-primary success-btn">🛍️ Seguir comprando</Link>
          <a
            href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '543572595756'}?text=${encodeURIComponent(isTransfer ? `¡Hola! Acabo de hacer una reserva por transferencia. Mi N° de pedido es ${paymentId}. Aquí te envío el comprobante:` : '¡Hola! Acabo de hacer una compra por la web. Quería confirmar el pedido.')}`}
            className="success-whatsapp-btn"
            target="_blank"
            rel="noreferrer"
          >
            💬 {isTransfer ? 'Enviar Comprobante por WhatsApp' : 'Consultar por WhatsApp'}
          </a>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
