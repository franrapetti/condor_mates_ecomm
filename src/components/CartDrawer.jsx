import React, { useState } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { X, Trash2, ShoppingBag, ShieldCheck } from 'lucide-react';
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
          <button className="close-btn" onClick={handleClose} style={{display: 'flex', alignItems: 'center'}}><X size={24} strokeWidth={1.5} /></button>
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
          <div className="cart-empty" style={{textAlign: 'center', marginTop: '3rem'}}>
            <ShoppingBag size={48} strokeWidth={1} style={{marginBottom: '1rem', color: 'var(--text-light)'}} />
            <p>Tu carrito está vacío.</p>
            <button className="continue-shopping mt-4" onClick={handleClose} style={{padding: '0.75rem 1.5rem', background: 'var(--text-dark)', color: 'var(--surface)', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer'}}>Ver Catálogo</button>
          </div>
        ) : isCheckout ? (
          <div className="checkout-form-container">
            {!preferenceId ? (
              <form className="checkout-form fade-in" onSubmit={handleCheckoutSubmit}>
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
                  
                  <button type="submit" onClick={() => setSubmitAction('mp')} className="whatsapp-btn mp-btn" disabled={isPaying} style={{backgroundColor: '#009ee3'}}>
                    {isPaying ? 'Conectando Seguro...' : '💳 Pagar Seguro con Mercado Pago'}
                  </button>
                  <button type="submit" onClick={() => setSubmitAction('whatsapp')} className="whatsapp-btn " disabled={isPaying} style={{marginTop: '-0.5rem', backgroundColor: '#25D366', color: 'white', border: 'none'}}>
                    💬 Acordar con Vendedor
                  </button>
                  
                  <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#25D366', fontWeight: 'bold', marginTop: '0.5rem', paddingBottom: '0.5rem' }}>
                    Con transferencia pagás solo ${Math.round(total * 0.9).toLocaleString()} (-10% OFF Extra)
                  </div>
                  
                  <div className="trust-badges-container">
                    <div className="trust-logos">
                      <img src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.19.1/mercadolibre/logo__small@2x.png" alt="Mercado Pago" title="MercadoPago" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" alt="Visa" title="Visa" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" alt="Mastercard" title="Mastercard" />
                    </div>
                    <p className="trust-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                      <ShieldCheck size={14} /> PAGO 100% SEGURO Y CIFRADO
                    </p>
                  </div>
                </div>
              </form>
            ) : (
              <div className="checkout-summary fade-in">
                <div className="summary-success-icon">✓</div>
                <h3 className="summary-title">¡Casi listo!</h3>
                <p className="summary-subtitle">Revisá tu pedido y elegí cómo pagar</p>
                
                <div className="summary-card">
                  <h4>Tus Datos</h4>
                  <p><strong>{formData.name}</strong></p>
                  <p>{formData.email}</p>
                  <p>📍 {formData.city}</p>
                  {formData.notes && <p className="summary-notes">🗒️ {formData.notes}</p>}
                </div>

                <div className="summary-card">
                  <h4>Tu Pedido</h4>
                  <ul className="summary-items">
                    {cartItems.map(item => (
                      <li key={item.id}>
                        <div className="summary-item-info">
                          <span className="summary-qty">{item.quantity}x</span> {item.name}
                        </div>
                        <span className="summary-item-price">${((item.promo_price || item.price) * item.quantity).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="summary-total">
                    <span>Total a pagar:</span>
                    <span className="summary-total-price">${total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="summary-actions">
                  <div className="mp-wallet-container">
                    <p className="mp-instruction">Hacé click en pagar de forma segura 👇</p>
                    <Wallet initialization={{ preferenceId }} customization={{ texts: { valueProp: 'security_details' } }} />
                  </div>
                  <button type="button" className="btn-back btn-back-link" onClick={() => setPreferenceId(null)}>← Corregir mis datos</button>
                </div>
              </div>
            )}
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
                  <button className="remove-btn" onClick={() => onRemoveItem(item.id)} style={{display: 'flex', alignItems: 'center'}}><Trash2 size={18} strokeWidth={1.5} /></button>
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
