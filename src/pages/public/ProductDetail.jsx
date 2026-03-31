import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useLaunchTimer } from '../../hooks/useLaunchTimer';
import Header from '../../components/Header';
import ProductCard from '../../components/ProductCard';
import { ProductDetailSkeleton } from '../../components/ProductSkeleton';
import { Helmet } from 'react-helmet-async';
import { Heart, ShoppingBag } from 'lucide-react';
import './ProductDetail.css';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartCount, setIsCartOpen } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { isLaunched } = useLaunchTimer();
  
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ user_name: '', rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Bundling state
  const [bundleAddon, setBundleAddon] = useState(null);

  // Color variants
  const [colorVariants, setColorVariants] = useState([]);

  // Accordions and Shipping
  const [activeAccordion, setActiveAccordion] = useState('desc');
  const [postalCode, setPostalCode] = useState('');
  const [shippingResult, setShippingResult] = useState(null);

  // Zoom Lightbox
  const [isZoomOpen, setIsZoomOpen] = useState(false);

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
        setActiveImageIdx(0);

        // ── Fetch Reviews ──
        // Fail gracefully if table doesn't exist yet
        try {
          const { data: revs } = await supabase.from('reviews').select('*').eq('product_id', id).order('created_at', { ascending: false });
          if (revs) setReviews(revs);
        } catch (e) {
          console.warn('Reviews table might not be set up yet.');
        }

        // ── Fetch Related / Bundle ──
        // For bundling: if it's a Mate, try suggesting a Termo or Bombilla
        let addonCat = data.category;
        if (data.category === 'Mates') addonCat = 'Termos - Termolar'; // Ex: suggest a Termo
        
        const { data: addonData, error: addonErr } = await supabase.from('products')
          .select('*')
          .ilike('category', addonCat === 'Mates' ? '%Termos%' : '%Mates%')
          .limit(1);

        if (addonData && addonData.length > 0 && data.category === 'Mates') {
          setBundleAddon(addonData[0]);
        } else {
          setBundleAddon(null);
        }

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
        setColorVariants([]);

        // ── Fetch Color Variants ──
        if (data.color_group) {
          const { data: variants } = await supabase
            .from('products')
            .select('id, color_name, image_url')
            .eq('color_group', data.color_group)
            .neq('id', data.id);
          if (variants) setColorVariants(variants);
        }
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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newReview.user_name || !newReview.rating) return;
    setIsSubmittingReview(true);
    try {
      const { data, error } = await supabase.from('reviews').insert([{
        product_id: product.id,
        user_name: newReview.user_name,
        rating: newReview.rating,
        comment: newReview.comment
      }]).select();
      
      if (error) throw error;
      setReviews(prev => [data[0], ...prev]);
      setNewReview({ user_name: '', rating: 5, comment: '' });
      alert('¡Gracias por tu reseña!');
    } catch (err) {
      alert('Ocurrió un error al enviar la reseña. Verificá que la tabla SQL esté creada.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleBundleAdd = () => {
    addToCart(product);
    if (bundleAddon) addToCart(bundleAddon);
    setIsCartOpen(true);
  };

  if (loading) return <ProductDetailSkeleton />;
  if (!product) return null;

  const gallery = [product.image_url, ...(product.gallery_images || [])].filter(Boolean);
  
  const reviewCount = reviews.length;
  const ratingAvg = reviewCount > 0 ? (reviews.reduce((a, b) => a + b.rating, 0) / reviewCount).toFixed(1) : 0;

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
            <div className="main-image-container" onClick={() => setIsZoomOpen(true)} style={{cursor: 'zoom-in'}}>
              <img src={activeImage} alt={product.name} className="main-image" decoding="async" />
              {gallery.length > 1 && (
                <>
                  <button
                    className="gallery-arrow gallery-arrow-prev"
                    onClick={() => {
                      const newIdx = (activeImageIdx - 1 + gallery.length) % gallery.length;
                      setActiveImageIdx(newIdx);
                      setActiveImage(gallery[newIdx]);
                    }}
                    aria-label="Imagen anterior"
                  >‹</button>
                  <button
                    className="gallery-arrow gallery-arrow-next"
                    onClick={() => {
                      const newIdx = (activeImageIdx + 1) % gallery.length;
                      setActiveImageIdx(newIdx);
                      setActiveImage(gallery[newIdx]);
                    }}
                    aria-label="Imagen siguiente"
                  >›</button>
                </>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="thumbnail-list">
                {gallery.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt={`Vista ${idx + 1}`} 
                    className={`thumbnail ${activeImageIdx === idx ? 'active' : ''}`}
                    onClick={() => { setActiveImage(img); setActiveImageIdx(idx); }}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div className="product-info">
            {product.category && <span className="category-badge">{product.sub_category || product.category}</span>}
            <h1 className="product-title-large">{product.name}</h1>

            {/* Color Variants */}
            {(colorVariants.length > 0 || product.color_name) && (
              <div className="color-variants">
                <span className="color-variant-label">
                  {product.category === 'Yerbas' ? '⚖️ Tamaño:' : '🎨 Color:'}
                </span>
                <span className="color-swatch-name active">
                  {product.color_name || 'Este color'}
                </span>
                {colorVariants.map(v => (
                  <span
                    key={v.id}
                    className="color-swatch-name"
                    onClick={() => navigate(`/producto/${v.id}`)}
                    style={{cursor:'pointer'}}
                  >
                    {v.color_name || 'Otro color'}
                  </span>
                ))}
              </div>
            )}
            
            {/* Reviews Summary */}
            {reviewCount > 0 && (
              <div className="product-rating-summary" onClick={() => document.getElementById('reviews-section').scrollIntoView({behavior: 'smooth'})} style={{cursor: 'pointer'}}>
                <span className="stars">{'★'.repeat(Math.round(ratingAvg))}{'☆'.repeat(5 - Math.round(ratingAvg))}</span>
                <span className="rating-text">{ratingAvg} ({reviewCount} reseñas)</span>
              </div>
            )}
            
            {isLaunched && (
              <>
                {product.promo_price ? (
                  <div className="product-price-block detail-price-block">
                    <span className="product-price-promo detail-price-promo">${product.promo_price.toLocaleString()}</span>
                    <span className="product-price-original">${product.price.toLocaleString()}</span>
                    <span className="discount-badge">{Math.round((1 - product.promo_price / product.price) * 100)}% OFF</span>
                  </div>
                ) : (
                  <p className="product-price-large">${product.price.toLocaleString()}</p>
                )}
                <p className="transfer-price-detail">
                  💸 <strong style={{color:'#e53935'}}>${Math.round((product.promo_price || product.price) * 0.9).toLocaleString()}</strong> con transferencia (10% OFF)
                </p>
              </>
            )}
            
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
            {isLaunched && (
              <div className="trust-badges">
                <span>💳 Pagos Seguros MP</span>
                <span>🚚 Envíos por Andreani</span>
                <span>🛡️ Compra Protegida</span>
              </div>
            )}
            
            <div className="detail-cta-row">
              {isLaunched && (
                <button 
                  className="add-to-cart-large" 
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}
                >
                  {product.stock === 0 ? 'Sin Stock' : 'Agregar al Carrito 🛒'}
                </button>
              )}
              <button 
                className={`detail-wishlist-btn ${isWishlisted(product.id) ? 'wishlisted' : ''}`}
                onClick={() => toggleWishlist(product)}
                title={isWishlisted(product.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                aria-label={isWishlisted(product.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              >
                <Heart size={22} fill={isWishlisted(product.id) ? "currentColor" : "none"} strokeWidth={1.5} />
              </button>
            </div>
            {isLaunched && <p className="secure-checkout-text">🔒 Pagos procesados encriptados via Mercado Pago</p>}

            {/* Calculador Andreani */}
            {isLaunched && (
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
            )}

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

            {/* Armá tu Kit Section (Upselling) */}
            {isLaunched && bundleAddon && (
              <div className="bundle-section fade-in">
                <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <ShoppingBag size={22} strokeWidth={1.5} /> Armá tu Kit Perfecto
                </h3>
                <p className="bundle-desc">Agregá ambos productos y completá tu experiencia matera original.</p>
                <div className="bundle-items">
                  <div className="bundle-item main">
                    <img src={product.image_url} alt="Mate" />
                  </div>
                  <span className="bundle-plus">+</span>
                  <div className="bundle-item addon">
                    <img src={bundleAddon.image_url} alt="Accesorio" />
                    <div className="bundle-addon-info">
                      <strong>{bundleAddon.name}</strong>
                      <span>${(bundleAddon.promo_price || bundleAddon.price).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button className="add-bundle-btn" onClick={handleBundleAdd} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                  Sumar Combo al Carrito <ShoppingBag size={18} strokeWidth={2} />
                </button>
              </div>
            )}
            
          </div>
        </div>

        {/* Reviews Section */}
        <div id="reviews-section" className="reviews-wrapper fade-in">
          <div className="reviews-header">
            <h2>Reseñas de Clientes</h2>
            <div className="reviews-rating-big">
              {reviewCount > 0 ? (
                <>
                  <span className="big-score">{ratingAvg}</span>
                  <div className="big-stars">
                    {'★'.repeat(Math.round(ratingAvg))}{'☆'.repeat(5 - Math.round(ratingAvg))}
                    <span>basado en {reviewCount} opiniones</span>
                  </div>
                </>
              ) : (
                <p>Se el primero en dejar una reseña sobre este producto.</p>
              )}
            </div>
          </div>

          <div className="reviews-content">
            <div className="reviews-form-container">
              <h3>Dejar una Reseña</h3>
              <form onSubmit={handleSubmitReview} className="review-form">
                <div className="form-group">
                  <label>Tu Nombre</label>
                  <input type="text" required value={newReview.user_name} onChange={e => setNewReview({...newReview, user_name: e.target.value})} placeholder="Ej: Lucas M." />
                </div>
                <div className="form-group">
                  <label>Calificación (1 a 5)</label>
                  <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})}>
                    <option value={5}>⭐⭐⭐⭐⭐ (Excelente)</option>
                    <option value={4}>⭐⭐⭐⭐ (Muy Bueno)</option>
                    <option value={3}>⭐⭐⭐ (Bueno)</option>
                    <option value={2}>⭐⭐ (Regular)</option>
                    <option value={1}>⭐ (Malo)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Comentario (Opcional)</label>
                  <textarea rows="3" value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} placeholder="Contanos qué te pareció el producto..." />
                </div>
                <button type="submit" disabled={isSubmittingReview}>
                  {isSubmittingReview ? 'Enviando...' : 'Publicar Reseña'}
                </button>
              </form>
            </div>

            <div className="reviews-list">
              {reviews.map(rev => (
                <div key={rev.id} className="review-card">
                  <div className="review-card-header">
                    <strong>{rev.user_name}</strong>
                    <span className="stars">{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                  </div>
                  <span className="review-date">{new Date(rev.created_at).toLocaleDateString()}</span>
                  {rev.comment && <p className="review-comment">{rev.comment}</p>}
                </div>
              ))}
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

      {/* Image Zoom Modal */}
      {isZoomOpen && (
        <div className="zoom-lightbox-overlay" onClick={() => setIsZoomOpen(false)}>
          <button className="zoom-lightbox-close" onClick={() => setIsZoomOpen(false)} aria-label="Cerrar zoom">✕</button>
          <img src={activeImage} alt={product.name} className="zoom-lightbox-image" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

export default ProductDetail;
