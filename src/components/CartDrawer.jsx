import React, { useState } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { X, Trash2, ShoppingBag, ShieldCheck, CreditCard, Landmark } from 'lucide-react';
import { trackPixelEvent, trackTikTokEvent, logAnalyticsEvent } from '../lib/analytics';
import './CartDrawer.css';

// Initialize MP with public key (fallback to TEST if not found)
initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY || 'TEST-PUBLIC-KEY', { locale: 'es-AR' });

const CartDrawer = ({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem }) => {
  const [isCheckout, setIsCheckout] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', postalCode: '', city: '', notes: '' });
  const [preferenceId, setPreferenceId] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);

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
  // Solo calculamos el porcentaje sobre el subtotal sin envío
  const progressPercent = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD - total;
  
  const finalTotal = total + (selectedShipping ? selectedShipping.cost : 0);

  const handleClose = () => {
    setIsCheckout(false);
    setPreferenceId(null);
    onClose();
  };

  const handlePostalCodeChange = async (e) => {
    const cp = e.target.value;
    setFormData({...formData, postalCode: cp});
    
    if (cp.length >= 4) {
      try {
        const response = await fetch('/api/calculate_shipping', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ postalCode: cp })
        });
        const data = await response.json();
        setShippingOptions(data.options || []);
        if (data.options?.length > 0 && !selectedShipping) {
          setSelectedShipping(data.options[0]);
        }
      } catch (err) {}
    } else {
      setShippingOptions([]);
      setSelectedShipping(null);
    }
  };

  const savePartialLead = async () => {
    if (!formData.email) return;
    try {
      await fetch('/api/save_cart_lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          phone: '', // Can add phone later if needed
          cartData: cartItems,
          total: finalTotal
        })
      });
    } catch (e) {
      // fail silent
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    
    if (submitAction === 'whatsapp') {
      setIsPaying(true);
      try {
        sessionStorage.setItem('mate_last_cart', JSON.stringify(cartItems));
        sessionStorage.setItem('mate_last_total', Math.round(finalTotal * 0.8).toString()); // 20% discount

        const response = await fetch('/api/create_transfer_order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems,
            customer: formData,
            shippingMethod: selectedShipping,
            total: Math.round(finalTotal * 0.8), // 20% discount total
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
      sessionStorage.setItem('mate_last_total', finalTotal.toString());

      const response = await fetch('/api/create_preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          customer: formData,
          shippingMethod: selectedShipping,
          total: finalTotal,
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
        <div className="cart-header" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '10px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center'}}>
            <h2 style={{margin: 0}}>{isCheckout ? (preferenceId ? 'Pago' : 'Tus Datos') : 'Tu Carrito'}</h2>
            <button className="close-btn" onClick={handleClose} style={{display: 'flex', alignItems: 'center'}}><X size={24} strokeWidth={1.5} /></button>
          </div>
          {/* Progress Tracker */}
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-light)', width: '100%'}}>
            <span style={{color: !isCheckout ? 'var(--text-dark)' : 'inherit'}}>1. Carrito</span>
            <span>›</span>
            <span style={{color: isCheckout && !preferenceId ? 'var(--text-dark)' : 'inherit'}}>2. Datos</span>
            <span>›</span>
            <span style={{color: preferenceId ? 'var(--text-dark)' : 'inherit'}}>3. Pago</span>
          </div>
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
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} onBlur={savePartialLead} placeholder="Ej: Juan Pérez" />
                </div>
                <div className="form-group">
                  <label>Email (para envío del recibo)</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} onBlur={savePartialLead} placeholder="Ej: juan@email.com" />
                </div>
                <div className="form-group">
                  <label>Código Postal</label>
                  <input required type="text" value={formData.postalCode} onChange={handlePostalCodeChange} onBlur={savePartialLead} placeholder="Ej: 5000" />
                </div>
                <div className="form-group">
                  <label>Ciudad</label>
                  <input required type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} onBlur={savePartialLead} placeholder="Ej: Córdoba Capital" />
                </div>
                <div className="form-group">
                  <label>Notas Adicionales (Opcional)</label>
                  <textarea rows="3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} onBlur={savePartialLead} placeholder="Instrucciones para la entrega, etc." />
                </div>

                {shippingOptions.length > 0 && (
                  <div className="shipping-options-container" style={{marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)'}}>
                    <label style={{fontWeight: 'bold', marginBottom: '0.75rem', display: 'block', fontSize: '0.95rem'}}>Método de Envío</label>
                    {shippingOptions.map(opt => (
                      <label key={opt.id} style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s', backgroundColor: selectedShipping?.id === opt.id ? 'var(--accent-light)' : 'transparent'}}>
                        <input 
                          type="radio" 
                          name="shippingMethod" 
                          value={opt.id}
                          checked={selectedShipping?.id === opt.id}
                          onChange={() => setSelectedShipping(opt)}
                          style={{width: '18px', height: '18px', accentColor: 'var(--accent)'}}
                          required
                        />
                        <span style={{flex: 1, fontSize: '0.9rem'}}>{opt.name}</span>
                        <strong style={{fontSize: '0.9rem'}}>{opt.cost === 0 ? 'Gratis' : `$${opt.cost.toLocaleString()}`}</strong>
                      </label>
                    ))}
                  </div>
                )}
                
                <div className="cart-total checkout-total">
                  <span>Subtotal:</span>
                  <span className="total-price">${total.toLocaleString()}</span>
                </div>
                {selectedShipping && (
                  <div className="cart-total checkout-total" style={{marginTop: '-0.5rem', borderTop: 'none', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                    <span>Envío ({selectedShipping.name}):</span>
                    <span>{selectedShipping.cost === 0 ? 'Gratis' : `$${selectedShipping.cost.toLocaleString()}`}</span>
                  </div>
                )}
                <div className="cart-total checkout-total" style={{paddingTop: '0.5rem'}}>
                  <span>Total a pagar:</span>
                  <span className="total-price" style={{color: 'var(--accent)'}}>${finalTotal.toLocaleString()}</span>
                </div>
                
                <div className="checkout-actions">
                  <button type="button" className="btn-back" onClick={() => setIsCheckout(false)}>← Volver al carrito</button>
                  <div style={{textAlign: 'center', margin: '1rem 0', fontSize: '0.85rem'}}>
                    <div style={{color: '#e5b62b', fontSize: '1.2rem', letterSpacing: '2px', marginBottom: '2px'}}>★★★★★</div>
                    <strong style={{color: 'var(--text-dark)'}}>4.9/5</strong> basado en más de 500 clientes felices.
                  </div>

                  <button type="submit" onClick={() => setSubmitAction('mp')} className="whatsapp-btn mp-btn" disabled={isPaying} style={{backgroundColor: '#009ee3', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                    {isPaying ? 'Procesando...' : <><CreditCard size={20} /> Pagar Seguro con Mercado Pago →</>}
                  </button>
                  
                  <div style={{position: 'relative', marginTop: '-0.5rem'}}>
                    <span style={{position: 'absolute', top: '-10px', right: '10px', backgroundColor: '#e65100', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', zIndex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.2)'}}>RECOMENDADO</span>
                    <button type="submit" onClick={() => setSubmitAction('whatsapp')} className="whatsapp-btn " disabled={isPaying} style={{backgroundColor: '#25D366', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%'}}>
                      {isPaying ? 'Procesando...' : <><Landmark size={20} /> Pagar con Transferencia (-20% OFF Extras) →</>}
                    </button>
                  </div>
                  
                  <div className="trust-badges-container">
                    <div className="trust-logos">
                      <img src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.19.1/mercadolibre/logo__small@2x.png" alt="Mercado Pago" title="MercadoPago" />
                      <svg className="visa-logo-svg" viewBox="0 0 32 10" width="40" height="13" fill="none" xmlns="http://www.w3.org/2000/svg" title="Visa">
                        <path fill="#1434CB" d="M14.636 0l-1.896 9.53H9.702L11.597 0h3.039zm12.302 0l-1.503 6.945c-.218.995-1.127 1.455-2.072 1.455h-2.906l1.45-6.945c.231-.994 1.134-1.455 2.067-1.455h2.964zm-5.632 0l-1.897 9.53h-3.04l1.898-9.53h3.039zM8.337 0L5.352 6.814 3.733 1.2C3.51.272 2.766 0 1.83 0H0l2.915 9.53h3.292l3.708-9.53H8.337z"/>
                      </svg>
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
                  <p>📍 {formData.city} (CP: {formData.postalCode})</p>
                  {selectedShipping && <p style={{marginTop: '0.5rem', color: 'var(--accent)'}}>🚚 {selectedShipping.name}</p>}
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
                  {selectedShipping && selectedShipping.cost > 0 && (
                    <div className="summary-total" style={{borderTop: 'none', paddingTop: 0, paddingBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                      <span>Costo de envío:</span>
                      <span>${selectedShipping.cost.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="summary-total">
                    <span>Total a pagar:</span>
                    <span className="summary-total-price">${finalTotal.toLocaleString()}</span>
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
