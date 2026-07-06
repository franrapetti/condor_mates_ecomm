import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { notifyNewOrder } from '../../lib/notifications';
import { useCart } from '../../context/CartContext';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Clock, Package, Landmark, ShoppingBag, Copy, Check } from 'lucide-react';
import { trackPixelEvent, trackTikTokEvent, logAnalyticsEvent } from '../../lib/analytics';
import './CheckoutSuccess.css';

const WhatsAppIcon = ({ size = 24, style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const { clearCart } = useCart();
  
  const [lastCart, setLastCart] = useState([]);
  const [lastTotal, setLastTotal] = useState(0);
  const [copiedField, setCopiedField] = useState(null);

  const hasTracked = useRef(false);

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
    if (status === 'approved' && !hasTracked.current) {
      hasTracked.current = true;
      clearCart();
      
      // Meta Pixel: Purchase event with full e-commerce data
      trackPixelEvent('Purchase', {
        currency: 'ARS',
        value: savedTotal,
        transaction_id: paymentId || undefined,
        content_type: 'product',
        content_ids: savedCart.map(i => String(i.id)),
        num_items: savedCart.reduce((acc, i) => acc + (i.quantity || 1), 0),
        contents: savedCart.map(i => ({
          id: String(i.id),
          quantity: i.quantity || 1,
          item_price: i.promo_price || i.price,
        })),
      });

      // TikTok Pixel: CompletePayment (Purchase conversion for TikTok Ads)
      trackTikTokEvent('CompletePayment', {
        value: savedTotal,
        currency: 'ARS',
        contents: savedCart.map(i => ({
          content_id: String(i.id),
          content_name: i.name,
          quantity: i.quantity || 1,
          price: i.promo_price || i.price,
        })),
      });

      // Funnel tracking
      logAnalyticsEvent('purchase', {
        payment_id: paymentId,
        total: savedTotal,
        item_count: savedCart.length,
      });
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
        <div className="success-icon" style={{display: 'flex', justifyContent: 'center'}}>
          {isApproved ? <CheckCircle2 size={64} color="var(--accent)" /> : <Clock size={64} color="var(--text-light)" />}
        </div>
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
            <h3 className="success-items-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={20} /> Tu pedido
            </h3>
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
              <Landmark size={20} /> Datos de Transferencia
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <strong>Alias:</strong> condormates
                <button onClick={() => handleCopy('condormates', 'alias')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.05)' }} title="Copiar Alias">
                  {copiedField === 'alias' ? <Check size={16} color="green" /> : <Copy size={16} color="#666" />}
                </button>
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <strong>CBU/CVU:</strong> 0000076500000011685113
                <button onClick={() => handleCopy('0000076500000011685113', 'cbu')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.05)' }} title="Copiar CBU">
                  {copiedField === 'cbu' ? <Check size={16} color="green" /> : <Copy size={16} color="#666" />}
                </button>
              </p>
              <p style={{ margin: 0 }}><strong>Titular:</strong> Francisco Rapetti</p>
            </div>
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
          <Link to="/" className="btn-primary success-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <ShoppingBag size={20} /> Seguir comprando
          </Link>
          <a
            href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '543572595756'}?text=${encodeURIComponent(isTransfer ? `¡Hola! Acabo de hacer una reserva por transferencia. Mi N° de pedido es ${paymentId}. Aquí te envío el comprobante:` : '¡Hola! Acabo de hacer una compra por la web. Quería confirmar el pedido.')}`}
            className="success-whatsapp-btn"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <WhatsAppIcon size={20} /> {isTransfer ? 'Enviar Comprobante por WhatsApp' : 'Consultar por WhatsApp'}
          </a>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
