import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import Header from '../../components/Header';
import ProductCard from '../../components/ProductCard';
import { Helmet } from 'react-helmet-async';
import './ProductDetail.css';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartCount, setIsCartOpen } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [soldCount, setSoldCount] = useState(0);
  
  // Accordions and Shipping
  const [activeAccordion, setActiveAccordion] = useState('desc');
  const [postalCode, setPostalCode] = useState('');
  const [shippingResult, setShippingResult] = useState(null);

  const [isDark, setIsDark] = useState(() => document.body.classList.contains('dark-theme'));

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
    const fetchProduct = async () => {
      try {
        setLoading(true);
        window.scrollTo(0,0);
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) throw error;
        setProduct(data);
        setActiveImage(data.image_url);

        // Fetch related products
        const { data: relatedData } = await supabase.from('products')
          .select('*')
          .eq('category', data.category)
          .neq('id', data.id)
          .limit(4);
        setRelated((relatedData || []).filter(p => p.id !== data.id).slice(0, 3));
        
        // Fetch sold count for social proof
        const { data: orderData } = await supabase
          .from('orders')
          .select('items')
          .in('status', ['paid', 'shipped']);
        
        if (orderData) {
          let count = 0;
          orderData.forEach(order => {
            if (order.items) {
              order.items.forEach(item => {
                if (item.id === data.id) count += item.quantity;
              });
            }
          });
          setSoldCount(count);
        }
        
        // Reset state on navigation
        setShippingResult(null);
        setPostalCode('');
        setActiveAccordion('desc');
      } catch (err) {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, navigate]);

  const handleCalculateShipping = (e) => {
    e.preventDefault();
    if (!postalCode) return;
    
    // Fake Andreani Logic
    setTimeout(() => {
      const code = parseInt(postalCode);
      if (code >= 1000 && code < 2000) {
        setShippingResult({ cost: 3500, days: '1 a 2' });
      } else {
        setShippingResult({ cost: 5500, days: '3 a 5' });
      }
    }, 600);
  };

  if (loading) return <div className="container main-content"><p>Cargando producto...</p></div>;
  if (!product) return null;

  const gallery = [product.image_url, ...(product.gallery_images || [])].filter(Boolean);

  return (
    <>
      {product && ( // Conditionally render Helmet when product data is available
        <Helmet>
          <title>{product.name} | Cóndor Mates</title>
          <meta name="description" content={`Comprá ${product.name} al mejor precio. Envíos gratis a todo el país. Cóndor Mates 🦅`} />
          <meta property="og:title" content={`${product.name} | Oferta Limitada`} />
          <meta property="og:description" content={`Mira este ${product.name}. Stock disponible y envío rápido.`} />
          <meta property="og:image" content={product.image_url} />
          <meta property="og:url" content={window.location.href} />
          <meta property="og:type" content="product" />
        </Helmet>
      )}
      <Header 
        cartCount={cartCount} 
        onCartClick={() => setIsCartOpen(true)} 
        onNavClick={() => navigate('/')}
        currentCategory="Detalle"
        isDark={isDark}
        toggleTheme={toggleTheme}
      />
      
      <main className="container main-content fade-in">
        <button className="btn-back detail-back" onClick={() => navigate(-1)}>← Volver al catálogo</button>
        
        <div className="product-detail-layout">
          <div className="product-gallery">
            <div className="main-image-container">
              <img src={activeImage} alt={product.name} className="main-image" />
            </div>
            {gallery.length > 1 && (
              <div className="thumbnail-list">
                {gallery.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt={`Vista ${idx + 1}`} 
                    className={`thumbnail ${activeImage === img ? 'active' : ''}`}
                    onClick={() => setActiveImage(img)}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div className="product-info">
            {product.category === 'Mates' && <span className="category-badge">{product.sub_category}</span>}
            <h1 className="product-title-large">{product.name}</h1>
            <p className="product-price-large">${product.price.toLocaleString()}</p>
            
            {/* Social Proof */}
            <div className="product-social-proof">
              {soldCount > 0 && (
                <span className="sold-count-badge">🔥 {soldCount} persona{soldCount > 1 ? 's' : ''} ya lo compr{soldCount > 1 ? 'aron' : 'ó'}</span>
              )}
              {product.stock !== null && product.stock <= 5 && product.stock > 0 && (
                <span className="low-stock-badge">⚡ ¡Solo quedan {product.stock}!</span>
              )}
              {product.stock === 0 && (
                <span className="no-stock-badge">😔 Sin stock por el momento</span>
              )}
            </div>
            
            {/* Trust Badges Minimal */}
            <div className="trust-badges">
              <span>💳 Pagos Seguros MP</span>
              <span>🚚 Envíos por Andreani</span>
              <span>🛡️ Compra Protegida</span>
            </div>
            
            <div className="detail-cta-row">
              <button 
                className="add-to-cart-large" 
                onClick={() => addToCart(product)}
                disabled={product.stock === 0}
              >
                {product.stock === 0 ? 'Sin Stock' : 'Agregar al Carrito 🛒'}
              </button>
              <button 
                className={`detail-wishlist-btn ${isWishlisted(product.id) ? 'wishlisted' : ''}`}
                onClick={() => toggleWishlist(product)}
                title={isWishlisted(product.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              >
                {isWishlisted(product.id) ? '❤️' : '🤍'}
              </button>
            </div>
            <p className="secure-checkout-text">🔒 Pagos procesados encriptados via Mercado Pago</p>

            {/* Calculador Andreani */}
            <div className="shipping-calculator">
              <h4>📦 Calcular envío con Andreani</h4>
              <form onSubmit={handleCalculateShipping} className="shipping-form">
                <input 
                  type="number" 
                  placeholder="Tu Código Postal (Ej: 5000)" 
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value)}
                  required
                />
                <button type="submit">Calcular</button>
              </form>
              {shippingResult && (
                <div className="shipping-result fade-in">
                  <p>Retiro en Sucursal Andreani: <strong>${(shippingResult.cost - 1000).toLocaleString()}</strong></p>
                  <p>Envío a Domicilio: <strong>${shippingResult.cost.toLocaleString()}</strong></p>
                  <small>Llega envuelto y protegido en {shippingResult.days} días hábiles.</small>
                </div>
              )}
            </div>

            {/* Information Accordions */}
            <div className="product-accordions">
              <div className="accordion-item">
                <button className={`accordion-header ${activeAccordion === 'desc' ? 'active' : ''}`} onClick={() => setActiveAccordion(activeAccordion === 'desc' ? '' : 'desc')}>
                  Descripción
                  <span>{activeAccordion === 'desc' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'desc' && (
                  <div className="accordion-content fade-in">
                    <p>Cada pieza es seleccionada a mano por nuestros artesanos. Elaboración 100% original buscando siempre la mejor resonancia y durabilidad para tu ritual matero.</p>
                  </div>
                )}
              </div>
              
              <div className="accordion-item">
                <button className={`accordion-header ${activeAccordion === 'specs' ? 'active' : ''}`} onClick={() => setActiveAccordion(activeAccordion === 'specs' ? '' : 'specs')}>
                  Ficha Técnica
                  <span>{activeAccordion === 'specs' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'specs' && (
                  <div className="accordion-content fade-in">
                    <ul>
                      <li><strong>Material:</strong> Premium Seleccionado</li>
                      <li><strong>Origen:</strong> Producción Nacional 🇦🇷</li>
                      <li><strong>Armado:</strong> Reforzado con costuras gruesas</li>
                    </ul>
                  </div>
                )}
              </div>

              {product.category === 'Mates' && (
                <div className="accordion-item">
                  <button className={`accordion-header ${activeAccordion === 'care' ? 'active' : ''}`} onClick={() => setActiveAccordion(activeAccordion === 'care' ? '' : 'care')}>
                    ¿Cómo cuidar mi mate?
                    <span>{activeAccordion === 'care' ? '−' : '+'}</span>
                  </button>
                  {activeAccordion === 'care' && (
                    <div className="accordion-content fade-in">
                      <p>Para alargar la vida útil de tu mate, te recomendamos no dejarle yerba mojada de un día para el otro, y secarlo con una servilleta de papel húmeda tras cada uso. Curarlo con yerba usada durante 24hs antes del primer uso.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="related-products-section fade-in">
            <h3>También te puede interesar...</h3>
            <div className="product-grid" style={{ marginTop: '1.5rem' }}>
              {related.map(rel => (
                <ProductCard key={rel.id} product={rel} onAddToCart={addToCart} />
              ))}
            </div>
          </div>
        )}

      </main>
    </>
  );
}

export default ProductDetail;
