import React, { useState } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { X, Trash2, ShoppingBag, ShieldCheck } from 'lucide-react';
import { trackPixelEvent, trackTikTokEvent, logAnalyticsEvent } from '../lib/analytics';
import './CartDrawer.css';

// Initialize MP with public key (fallback to TEST if not found)
initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY || 'TEST-PUBLIC-KEY', { locale: 'es-AR' });

const CartDrawer = ({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem }) => {
  const [isCheckout, setIsCheckout] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', city: '', notes: '' });
  const [preferenceId, setPreferenceId] = useState(null);
  const [isPaying, setIsPaying] = useState(false);

  const [submitAction, setSubmitAction] = useState('mp');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, discount_amount, discount_value, discount_type, ... }
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  let baseTotal = 0;

  cartItems.forEach(item => {
    const itemPrice = item.promo_price || item.price;
    baseTotal += itemPrice * item.quantity;
  });

  const promoDiscount = appliedPromo ? appliedPromo.discount_amount : 0;
  const total = baseTotal - promoDiscount;
  const promoSaved = promoDiscount;

  // Free shipping threshold (Protective margin threshold)
  const FREE_SHIPPING_THRESHOLD = 120000;
  const progressPercent = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD - total;
  
  const handleClose = () => {
    setIsCheckout(false);
    setPreferenceId(null);
    onClose();
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    
    if (submitAction === 'whatsapp') {
      setIsPaying(true);
      try {
        sessionStorage.setItem('mate_last_cart', JSON.stringify(cartItems));
        sessionStorage.setItem('mate_last_total', Math.round(total * 0.9).toString()); // 10% discount

        const response = await fetch('/api/create_transfer_order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems,
            customer: formData,
            total: Math.round(total * 0.9), // 10% discount total
            source: localStorage.getItem('mate_traffic_source') || 'direct'
          })
        });
        
        const data = await response.json();
        if (data.id) {
          // Success! Redirect to checkout success with method=transfer
          window.location.href = `/checkout/success?status=approved&payment_id=${data.id}&method=transfer`;
        } else {
          alert(data.error || 'Hubo un error al crear la orden de transferencia.');
        }
      } catch (error) {
        console.error(error);
        alert('Error de conexión.');
      } finally {
        setIsPaying(false);
      }
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
          source: localStorage.getItem('mate_traffic_source') || 'direct'
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
                    {isPaying ? 'Procesando...' : '💳 Pagar Seguro con Mercado Pago'}
                  </button>
                  <button type="submit" onClick={() => setSubmitAction('whatsapp')} className="whatsapp-btn " disabled={isPaying} style={{marginTop: '-0.5rem', backgroundColor: '#25D366', color: 'white', border: 'none'}}>
                    {isPaying ? 'Procesando...' : '🏦 Pagar con Transferencia (-10% OFF Extras)'}
                  </button>
                  
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
              {/* Promo Code Engine — API-powered */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  value={promoCode} 
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }} 
                  placeholder="Tengo un cupón de descuento" 
                  style={{ flex: 1, padding: '12px', border: `1px solid ${promoError ? '#fca5a5' : 'var(--border)'}`, borderRadius: '12px', fontSize: '0.9rem', backgroundColor: appliedPromo ? '#f9f9f9' : 'white', fontWeight: 600 }}
                  disabled={!!appliedPromo || promoLoading}
                />
                {appliedPromo ? (
                  <button 
                    onClick={() => { setAppliedPromo(null); setPromoCode(''); setPromoError(''); }}
                    style={{ padding: '0 16px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                    Quitar
                  </button>
                ) : (
                  <button 
                    disabled={promoLoading || !promoCode.trim()}
                    onClick={async () => {
                      if (!promoCode.trim()) return;
                      setPromoLoading(true);
                      setPromoError('');
                      try {
                        const response = await fetch('/api/validate_coupon', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            code: promoCode.trim(),
                            cartTotal: baseTotal,
                            items: cartItems.map(i => ({
                              id: i.id,
                              name: i.name,
                              price: i.price,
                              promo_price: i.promo_price || null,
                              quantity: i.quantity,
                              category: i.category || '',
                            }))
                          })
                        });
                        const data = await response.json();
                        if (data.valid) {
                          setAppliedPromo(data);
                        } else {
                          setPromoError(data.error || 'Cupón inválido o expirado.');
                        }
                      } catch (err) {
                        setPromoError('Error de conexión al validar cupón.');
                      } finally {
                        setPromoLoading(false);
                      }
                    }}
                    style={{ padding: '0 20px', backgroundColor: 'var(--text-dark)', color: 'white', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: promoLoading ? 'wait' : 'pointer', opacity: promoLoading ? 0.6 : 1 }}>
                    {promoLoading ? '...' : 'Aplicar'}
                  </button>
                )}
              </div>
              {promoError && (
                <p style={{ margin: '-0.5rem 0 0.75rem', fontSize: '0.82rem', color: '#dc2626', fontWeight: 600 }}>{promoError}</p>
              )}

              <div className="cart-total">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: 800 }}>Total Final</span>
                  {appliedPromo && <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 'bold', backgroundColor: 'var(--accent-light)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>Cupón {appliedPromo.code} (-${promoSaved.toLocaleString()})</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  {appliedPromo && <span style={{ textDecoration: 'line-through', fontSize: '0.9rem', color: '#999', marginBottom: '-4px' }}>${baseTotal.toLocaleString()}</span>}
                  <span className="total-price" style={{ color: appliedPromo ? 'var(--accent)' : 'inherit' }}>${total.toLocaleString()}</span>
                </div>
              </div>
              <p className="shipping-notice">¡Envío con packaging de regalo incluido!</p>
              <button className="whatsapp-btn" onClick={() => {
                setIsCheckout(true);

                // Meta Pixel: InitiateCheckout
                trackPixelEvent('InitiateCheckout', {
                  value: total,
                  currency: 'ARS',
                  num_items: cartItems.reduce((acc, i) => acc + i.quantity, 0),
                  content_ids: cartItems.map(i => String(i.combo_parent_id || i.id)),
                  content_type: 'product',
                });

                // TikTok Pixel: InitiateCheckout
                trackTikTokEvent('InitiateCheckout', {
                  value: total,
                  currency: 'ARS',
                  contents: cartItems.map(i => ({
                    content_id: String(i.combo_parent_id || i.id),
                    content_name: i.name,
                    quantity: i.quantity,
                    price: i.promo_price || i.price,
                  })),
                });

                // Funnel tracking
                logAnalyticsEvent('initiate_checkout', {
                  cart_total: total,
                  item_count: cartItems.reduce((acc, i) => acc + i.quantity, 0),
                  coupon: appliedPromo?.code || null,
                });
              }}>
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
