import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './CorporatePage.css';

const WHATSAPP_NUMBER = '5491100000000'; // reemplazar con el número real

function CorporatePage() {
  const { cartCount, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => localStorage.getItem('mate_theme') === 'dark');
  const [corporateProducts, setCorporateProducts] = useState([]);
  const [form, setForm] = useState({
    company: '',
    contact: '',
    phone: '',
    qty: '',
    product: '',
    message: '',
  });

  const toggleTheme = () => {
    const newState = !isDark;
    setIsDark(newState);
    if (newState) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('mate_theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('mate_theme', 'light');
    }
  };

  useEffect(() => {
    const fetchCorporate = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_corporate', true);
      setCorporateProducts(data || []);
    };
    fetchCorporate();
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleWhatsApp = (e) => {
    e.preventDefault();
    const lines = [
      `🏢 *Consulta de Regalos Empresariales — Cóndor Mates*`,
      ``,
      `*Empresa:* ${form.company}`,
      `*Contacto:* ${form.contact}`,
      `*Teléfono:* ${form.phone}`,
      `*Producto de interés:* ${form.product || 'A definir'}`,
      `*Cantidad estimada:* ${form.qty || 'A definir'}`,
      `*Mensaje:* ${form.message || '—'}`,
    ];
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  return (
    <>
      <Helmet>
        <title>Regalos Empresariales | Cóndor Mates</title>
        <meta name="description" content="Regalos empresariales personalizados con el logo de tu empresa. Mates artesanales en cantidad. Cóndor Mates 🦅" />
      </Helmet>
      <Header
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
        onNavClick={() => navigate('/')}
        currentCategory="Empresas"
        isDark={isDark}
        toggleTheme={toggleTheme}
      />
      <main className="container main-content fade-in">
        {/* Hero */}
        <div className="corp-hero">
          <span className="corp-badge">🏢 Regalos Empresariales</span>
          <h1 className="corp-title">Mates con la identidad<br/><span className="text-gradient">de tu empresa</span></h1>
          <p className="corp-subtitle">
            Personalizamos mates artesanales con el logo de tu empresa. Precios especiales por cantidad, ideales para regalos corporativos, eventos y kit de bienvenida.
          </p>
          <div className="corp-trust-row">
            <span>🎨 Con tu logo</span>
            <span>📦 Packaging premium</span>
            <span>🚀 Envíos masivos</span>
            <span>💬 Asesoramiento personalizado</span>
          </div>
        </div>

        {/* How it works */}
        <div className="corp-steps">
          <h2>¿Cómo funciona?</h2>
          <div className="corp-steps-grid">
            <div className="corp-step">
              <div className="corp-step-num">1</div>
              <h3>Elegís el producto</h3>
              <p>Seleccionás el mate o accesorio que mejor representa a tu empresa.</p>
            </div>
            <div className="corp-step">
              <div className="corp-step-num">2</div>
              <h3>Nos enviás el logo</h3>
              <p>Mandás el logo en alta resolución y definimos el estilo de personalización.</p>
            </div>
            <div className="corp-step">
              <div className="corp-step-num">3</div>
              <h3>Recibís tu pedido</h3>
              <p>Producimos y enviamos con packaging premium. ¡Listo para regalar!</p>
            </div>
          </div>
        </div>

        {/* Products */}
        {corporateProducts.length > 0 && (
          <div className="corp-products-section">
            <h2>Productos disponibles</h2>
            <div className="corp-products-grid">
              {corporateProducts.map(p => (
                <div key={p.id} className="corp-product-card">
                  <img src={p.image_url} alt={p.name} />
                  <div className="corp-product-info">
                    <h3>{p.name}</h3>
                    {p.corporate_pricing ? (
                      <div className="corp-pricing-table">
                        {p.corporate_pricing.map((tier, i) => (
                          <div key={i} className="corp-tier">
                            <span className="corp-tier-qty">
                              {tier.min}
                              {tier.max ? `–${tier.max}` : '+'} unidades
                            </span>
                            <span className="corp-tier-price">${tier.price.toLocaleString()} c/u</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="corp-price-consult">Precio a consultar</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Form */}
        <div className="corp-contact-section">
          <div className="corp-contact-left">
            <h2>Contactanos</h2>
            <p>Completá el formulario y te contactamos en menos de 24hs hábiles con un presupuesto personalizado.</p>
            <ul className="corp-benefits">
              <li>✅ +10 unidades: precio especial</li>
              <li>✅ +50 unidades: diseño sin cargo</li>
              <li>✅ +100 unidades: envío gratis</li>
              <li>✅ Factura A y B disponible</li>
            </ul>
          </div>
          <form className="corp-form" onSubmit={handleWhatsApp}>
            <div className="corp-form-row">
              <div className="corp-form-group">
                <label>Empresa *</label>
                <input required name="company" value={form.company} onChange={handleChange} placeholder="Ej: Acme SA" />
              </div>
              <div className="corp-form-group">
                <label>Tu nombre *</label>
                <input required name="contact" value={form.contact} onChange={handleChange} placeholder="Ej: Santiago G." />
              </div>
            </div>
            <div className="corp-form-row">
              <div className="corp-form-group">
                <label>Teléfono / WhatsApp *</label>
                <input required name="phone" value={form.phone} onChange={handleChange} placeholder="Ej: 11 4567-8901" />
              </div>
              <div className="corp-form-group">
                <label>Cantidad estimada</label>
                <input name="qty" value={form.qty} onChange={handleChange} placeholder="Ej: 50" type="number" min="1" />
              </div>
            </div>
            <div className="corp-form-group">
              <label>Producto de interés</label>
              <input name="product" value={form.product} onChange={handleChange} placeholder="Ej: Mate Torpedo Premium" />
            </div>
            <div className="corp-form-group">
              <label>Mensaje adicional</label>
              <textarea name="message" value={form.message} onChange={handleChange} rows={3} placeholder="Contanos más sobre lo que necesitás (colores, fecha de entrega, personalización, etc.)" />
            </div>
            <button type="submit" className="corp-submit-btn">
              <span>💬 Consultar por WhatsApp</span>
              <small>Se va a abrir WhatsApp con tu consulta pre-armada</small>
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

export default CorporatePage;
