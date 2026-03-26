import React, { useState } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import './CartDrawer.css';

// Initialize MP with public key (fallback to TEST if not found)
initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY || 'TEST-PUBLIC-KEY', { locale: 'es-AR' });

const CartDrawer = ({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem }) => {
  const [isCheckout, setIsCheckout] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', city: '', notes: '' });
  const [preferenceId, setPreferenceId] = useState(null);
  const [isPaying, setIsPaying] = useState(false);

  const total = cartItems.reduce((acc, item) => {
    const itemPrice = item.promo_price || item.price;
    return acc + (itemPrice * item.quantity);
  }, 0);

  // Free shipping threshold (Protective margin threshold)
  const FREE_SHIPPING_THRESHOLD = 120000;
  const progressPercent = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD - total;
  
  const handleClose = () => {
    setIsCheckout(false);
    setPreferenceId(null);
    onClose();
  };

  const [submitAction, setSubmitAction] = useState('mp');

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    
    if (submitAction === 'whatsapp') {
      let message = `*¡Hola! Quiero hacer un pedido por la web*\n\n`;
      message += `*Mis datos:*\n`;
      message += `- Nombre: ${formData.name}\n`;
      message += `- Email: ${formData.email}\n`;
      message += `- Ciudad: ${formData.city}\n`;
      if(formData.notes) message += `- Notas: ${formData.notes}\n`;
      message += `\n*Mi pedido:*\n`;
      
      cartItems.forEach(item => {
        message += `- ${item.quantity}x ${item.name} ($${item.price.toLocaleString()})\n`;
      });
      
      message += `\n*Total estimado: $${total.toLocaleString()}*`;
      
      const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '543572595756';
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      return;
    }

    setIsPaying(true);
    
    try {
      // Save cart snapshot to sessionStorage BEFORE redirecting to MP
      // so the success page can display what was purchased
      sessionStorage.setItem('mate_last_cart', JSON.stringify(cartItems));
      sessionStorage.setItem('mate_last_total', total.toString());

      const response = await fetch('/api/create_preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          customer: formData,
          total: total,
          source: sessionStorage.getItem('mate_utm_source') || 'direct'
        })
      });
      
      const data = await response.json();
      if (data.id) {
        setPreferenceId(data.id);
      } else {
        // Show the specific error (e.g. out of stock message from the API)
        alert(data.error || 'Hubo un error al generar el link de pago.');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <>
      <div className={`cart-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}></div>
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>{isCheckout ? 'Tus Datos' : 'Tu Carrito'}</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        {/* Free Shipping Progress Bar */}
        {cartItems.length > 0 && !isCheckout && (
          <div className="shipping-progress-container">
            {remainingForFreeShipping > 0 ? (
              <p className="shipping-progress-text">
                Agregá <strong>${remainingForFreeShipping.toLocaleString()}</strong> más para <strong>Envío Gratis</strong> 📦
              </p>
            ) : (
              <p className="shipping-progress-text success">
                ¡Tenés <strong>Envío Gratis</strong> a todo el país! 🎉
              </p>
            )}
            <div className="shipping-progress-bar">
              <div 
                className={`shipping-progress-fill ${progressPercent === 100 ? 'success' : ''}`} 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="cart-empty">
            <span className="emoji-huge">🛒</span>
            <p>Tu carrito está vacío.</p>
            <button className="continue-shopping" onClick={handleClose}>Ver Mates</button>
          </div>
        ) : isCheckout ? (
          <div className="checkout-form-container">
            <form className="checkout-form" onSubmit={handleCheckoutSubmit}>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="form-group">
                <label>Email (para envío del recibo)</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Ej: juan@email.com" />
              </div>
              <div className="form-group">
                <label>Ciudad de Envío</label>
                <input required type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ej: Córdoba Capital" />
              </div>
              <div className="form-group">
                <label>Notas Adicionales (Opcional)</label>
                <textarea rows="3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Instrucciones para la entrega, etc." />
              </div>
              
              <div className="cart-total checkout-total">
                <span>Total a pagar:</span>
                <span className="total-price">${total.toLocaleString()}</span>
              </div>
              
              <div className="checkout-actions">
                <button type="button" className="btn-back" onClick={() => setIsCheckout(false)}>← Volver al carrito</button>
                
                {!preferenceId ? (
                  <>
                    <button type="submit" onClick={() => setSubmitAction('mp')} className="whatsapp-btn mp-btn" disabled={isPaying} style={{backgroundColor: '#009ee3'}}>
                      {isPaying ? 'Conectando Seguro...' : '💳 Pagar Seguro con Mercado Pago'}
                    </button>
                    <button type="submit" onClick={() => setSubmitAction('whatsapp')} className="whatsapp-btn " disabled={isPaying} style={{marginTop: '-0.5rem', backgroundColor: '#25D366', color: 'white', border: 'none'}}>
                      💬 Acordar con Vendedor
                    </button>
                    
                    <div className="trust-badges-container">
                      <div className="trust-logos">
                        <img src="https://logospng.org/download/mercado-pago/logo-mercado-pago-icono-256.png" alt="Mercado Pago" title="MercadoPago" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" title="Visa" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" alt="Mastercard" title="Mastercard" />
                      </div>
                      <p className="trust-text">🔒 PAGO 100% SEGURO Y CIFRADO</p>
                    </div>
                  </>
                ) : (
                  <div className="mp-wallet-container">
                    <Wallet initialization={{ preferenceId }} customization={{ texts: { valueProp: 'security_details' } }} />
                  </div>
                )}
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map(item => (
                <div key={item.id} className="cart-item fade-in">
                  <img src={item.image_url} alt={item.name} className="cart-item-image" />
                  <div className="cart-item-details">
                    <h4>{item.name}</h4>
                    <p className="cart-item-price">${(item.promo_price || item.price).toLocaleString()}</p>
                    <div className="quantity-controls">
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                  <button className="remove-btn" onClick={() => onRemoveItem(item.id)}>🗑️</button>
                </div>
              ))}
            </div>
            
            <div className="cart-footer">
              <div className="cart-total">
                <span>Total</span>
                <span className="total-price">${total.toLocaleString()}</span>
              </div>
              <p className="shipping-notice">¡Envío con packaging de regalo incluido!</p>
              <button className="whatsapp-btn" onClick={() => setIsCheckout(true)}>
                Continuar Compra →
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
