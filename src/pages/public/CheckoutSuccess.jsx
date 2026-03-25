import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import './CheckoutSuccess.css';

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear cart after successful payment
    if (status === 'approved') {
      clearCart();
      if (window.fbq && paymentId) {
        window.fbq('track', 'Purchase', { currency: 'ARS', transaction_id: paymentId });
      }
    }
  }, [status, paymentId, clearCart]);

  return (
    <div className="checkout-success-page fade-in">
      <div className="success-card">
        <div className="success-icon">✅</div>
        <h1>¡Pago Exitoso!</h1>
        <p>Tu pedido se ha procesado correctamente y ha quedado guardado en nuestro sistema. ¡Gracias por elegir Cóndor Mates!</p>
        
        {paymentId && (
          <div className="order-details">
            <p className="order-number">Número de Operación: <strong>{paymentId}</strong></p>
            <p className="order-instructions">Guarda este número para cualquier consulta sobre tu pedido.</p>
          </div>
        )}

        <Link to="/" className="btn-primary success-btn">Volver a la Tienda</Link>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
