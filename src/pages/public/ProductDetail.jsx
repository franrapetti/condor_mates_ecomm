import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useLaunchTimer } from '../../hooks/useLaunchTimer';
import { logProductPageView } from '../../hooks/useAnalytics';
import { trackPixelEvent, trackTikTokEvent, logAnalyticsEvent } from '../../lib/analytics';
import Header from '../../components/Header';
import ProductCard from '../../components/ProductCard';
import { ProductDetailSkeleton } from '../../components/ProductSkeleton';
import { Helmet } from 'react-helmet-async';
import { Heart, ShoppingBag, Star, Flame, ShoppingCart, ShieldCheck, Truck, CreditCard, BadgeCheck, Banknote, Zap, Frown, Package, Sparkles, Scale, Palette, Lock } from 'lucide-react';
import { getImgUrl } from '../../lib/imageUtils';
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
  const [isVariantSwitching, setIsVariantSwitching] = useState(false);
  const [activeImage, setActiveImage] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ user_name: '', rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Bundling state
  const [bundleItems, setBundleItems] = useState([]);

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

  const fetchProduct = async (productId, silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        window.scrollTo(0, 0);
      } else {
        setIsVariantSwitching(true);
      }

      const isId = /^\d+$/.test(productId) || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId);
      const { data, error } = await supabase.from('products').select('*').eq(isId ? 'id' : 'slug', productId).single();
      if (error) throw error;
      setProduct(data);
      setActiveImage(data.image_url);
      setActiveImageIdx(0);

      // ── Log product page view (links page_view row + increments visit_count) ──
      // ✅ FIX: await ensures the tracking completes before re-renders can cancel it
      if (!silent) {
        await logProductPageView(productId);

        // Meta Pixel: ViewContent — critical for dynamic product ads
        trackPixelEvent('ViewContent', {
          content_name: data.name,
          content_category: data.category || '',
          content_ids: [String(data.id)],
          content_type: 'product',
          value: data.promo_price || data.price,
          currency: 'ARS',
        });

        // TikTok Pixel: ViewContent
        trackTikTokEvent('ViewContent', {
          content_id: String(data.id),
          content_type: 'product',
          content_name: data.name,
          value: data.promo_price || data.price,
          currency: 'ARS',
        });

        // Funnel tracking
        logAnalyticsEvent('view_product', {
          product_id: data.id,
          product_name: data.name,
          category: data.category,
          price: data.promo_price || data.price,
        });
      }

      // ── Fetch Reviews ──
      try {
        const { data: revs } = await supabase.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
        if (revs) setReviews(revs);
      } catch (e) {
        console.warn('Reviews table might not be set up yet.');
      }

      // ── Fetch Bundle Items ──
      if (data.category === 'Mates') {
        const { data: materas } = await supabase.from('products')
          .select('*').ilike('category', '%Matera%').gte('price', 15000)
          .order('price', { ascending: true }).limit(5);
        const { data: bombillas } = await supabase.from('products')
          .select('*').ilike('category', '%Bombilla%').not('name', 'ilike', '%mini%')
          .order('price', { ascending: true }).limit(5);
        const kitItems = [];
        if (materas?.length) kitItems.push(materas[Math.floor(Math.random() * materas.length)]);
        if (bombillas?.length) kitItems.push(bombillas[Math.floor(Math.random() * bombillas.length)]);
        setBundleItems(kitItems);
      } else {
        setBundleItems([]);
      }

      const { data: relatedData } = await supabase.from('products')
        .select('*').eq('category', data.category).neq('id', data.id).limit(4);
      setRelated((relatedData || []).filter(p => p.id !== data.id).slice(0, 3));

      const { data: orderData } = await supabase.from('orders').select('items').in('status', ['paid', 'shipped']);
      if (orderData) {
        let count = 0;
        orderData.forEach(order => {
          order.items?.forEach(item => { if (item.id === data.id) count += item.quantity; });
        });
        setSoldCount(count);
      }

      setShippingResult(null);
      setPostalCode('');
      setActiveAccordion('desc');
      setColorVariants([]);

      if (data.color_group) {
        const { data: variants } = await supabase.from('products')
          .select('id, slug, color_name, image_url')
          .eq('color_group', data.color_group)
          .neq('id', data.id);
        if (variants) setColorVariants(variants);
      }
    } catch (err) {
      if (!silent) navigate('/');
    } finally {
      setLoading(false);
      setIsVariantSwitching(false);
    }
  };

  const handleVariantSwitch = (variant) => {
    navigate(`/producto/${variant.slug || variant.id}`, { replace: true });
  };

  useEffect(() => {
    fetchProduct(id, false);
  }, [id]);

  const handleCalculateShipping = async (e) => {
    e.preventDefault();
    if (!postalCode) return;
    
    setShippingResult(null);
    try {
      const response = await fetch('/api/calculate_shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postalCode })
      });
      const data = await response.json();
      if (data.options) {
        setShippingResult(data.options);
      } else {
        alert('Hubo un error al calcular el envío.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al calcular envío.');
    }
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
    bundleItems.forEach(item => addToCart(item));
    setIsCartOpen(true);
  };

  if (loading && !isVariantSwitching) return <ProductDetailSkeleton />;
  if (!product) return null;

  const gallery = [product.image_url, ...(product.gallery_images || [])].filter(Boolean);
  
  const reviewCount = reviews.length;
  const ratingAvg = reviewCount > 0 ? (reviews.reduce((a, b) => a + b.rating, 0) / reviewCount).toFixed(1) : 0;

  const getFramingText = (category) => {
    if (category === 'Yerbas') return 'Tu ritual de todos los días, por menos de lo que vale un alfajor.';
    return 'Un compañero para toda la vida por el costo de una cena.';
  };

  return (
    <>
      {product && (
        <Helmet>
          <title>{product.name} | Cóndor Mates</title>
          <meta name="description" content={`Comprá ${product.name} al mejor precio. Envíos gratis a todo el país. Cóndor Mates 🦅`} />
          
          {/* Open Graph / Facebook */}
          <meta property="og:type" content="product" />
          <meta property="og:url" content={window.location.href} />
          <meta property="og:title" content={`${product.name} | Cóndor Mates`} />
          <meta property="og:description" content={`💸 $${(product.promo_price || product.price).toLocaleString()} — Hecho con materiales premium. ¡Conseguí el tuyo!`} />
          <meta property="og:image" content={product.image_url} />
          <meta property="og:site_name" content="Cóndor Mates" />

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={`${product.name} | Cóndor Mates`} />
          <meta name="twitter:description" content={`Mira este ${product.name}. Stock disponible y envío rápido.`} />
          <meta name="twitter:image" content={product.image_url} />
          
          {/* Additional Product Meta */}
          <meta property="product:price:amount" content={product.promo_price || product.price} />
          <meta property="product:price:currency" content="ARS" />
          <meta property="product:condition" content="new" />
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
        
        <div className="product-detail-layout" style={{ opacity: isVariantSwitching ? 0.45 : 1, transition: 'opacity 0.2s ease' }}>
          <div className="product-gallery">
            <div className="main-image-container" onClick={() => setIsZoomOpen(true)} style={{cursor: 'zoom-in'}}>
              <img src={getImgUrl(activeImage, { w: 800, q: 75 })} alt={product.name} className="main-image" fetchPriority="high" />
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
                    src={getImgUrl(img, { w: 150, q: 60 })} 
                    alt={`Vista ${idx + 1}`} 
                    className={`thumbnail ${activeImageIdx === idx ? 'active' : ''}`}
                    onClick={() => { setActiveImage(img); setActiveImageIdx(idx); }}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div className="product-info">
            <div style={{display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap'}}>
              {product.category && <span className="category-badge" style={{margin: 0}}>{product.sub_category || product.category}</span>}
              {product.best_seller && (
                <span className="best-seller-badge" style={{position: 'relative', top: 'auto', left: 'auto'}}>
                  <Flame size={12} fill="currentColor" strokeWidth={1} />
                  MÁS VENDIDO
                </span>
              )}
            </div>
            <h1 className="product-title-large">{product.name}</h1>

            {/* Color Variants */}
            {(colorVariants.length > 0 || product.color_name) && (
              <div className="color-variants">
                <span className="color-variant-label" style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                  {product.category === 'Yerbas' ? <><Scale size={16} /> Tamaño:</> : <><Palette size={16} /> Color:</>}
                </span>
                <span className="color-swatch-name active">
                  {product.color_name || 'Este color'}
                </span>
                {colorVariants.map(v => (
                  <span
                    key={v.id}
                    className="color-swatch-name"
                    onClick={() => handleVariantSwitch(v)}
                    style={{cursor:'pointer'}}
                  >
                    {v.color_name || 'Otro color'}
                  </span>
                ))}
              </div>
            )}
            
            {/* Reviews Summary */}
            {product.reviews_count > 0 && (
              <div className="product-rating-summary" onClick={() => document.getElementById('reviews-section').scrollIntoView({behavior: 'smooth'})} style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem'}}>
                <div style={{display: 'flex', color: '#C6A87C'}}>
                  {Array.from({length: 5}).map((_, i) => (
                    <Star key={i} size={16} fill={i < Math.round(product.rating || 0) ? "currentColor" : "none"} strokeWidth={i < Math.round(product.rating || 0) ? 0 : 1} />
                  ))}
                </div>
                <span className="rating-text" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)'}}>{product.rating}</span>
                <span className="rating-text" style={{fontSize: '0.85rem', color: 'var(--text-light)'}}>({product.reviews_count} reseñas)</span>
              </div>
            )}
            
            {isLaunched && (
              <>
                {/* Transfer price — protagonista */}
                <div className="transfer-price-hero">
                  <span className="transfer-price-label" style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Banknote size={16} /> Pagando con transferencia</span>
                  <span className="transfer-price-amount">
                    ${Math.round((product.promo_price || product.price) * 0.8).toLocaleString()}
                  </span>
                  <span className="transfer-price-badge">20% OFF</span>
                </div>

                {/* List price — secundario */}
                {product.promo_price ? (
                  <div className="product-price-block detail-price-block" style={{ marginTop: '0.4rem' }}>
                    <span className="list-price-label">Precio de lista:</span>
                    <span className="detail-list-price">${product.price.toLocaleString()}</span>
                    <span className="discount-badge">{Math.round((1 - product.promo_price / product.price) * 100)}% OFF</span>
                  </div>
                ) : (
                  <p className="product-price-list-secondary">
                    Precio de lista: ${product.price.toLocaleString()}
                  </p>
                )}
                
                {/* Value Framing */}
                <div style={{marginTop: '0.5rem', marginBottom: '1rem', backgroundColor: 'var(--accent-light)', padding: '8px 12px', borderRadius: '8px', display: 'inline-block'}}>
                  <p style={{margin: 0, fontSize: '0.85rem', color: 'var(--text-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'}}>
                    💡 {getFramingText(product.category)}
                  </p>
                </div>
              </>
            )}
            
            {/* Social Proof */}
            <div className="product-social-proof">
              {soldCount > 0 && (
                <span className="sold-count-badge" style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Flame size={16} color="#e65100" /> {soldCount} persona{soldCount > 1 ? 's' : ''} ya lo compr{soldCount > 1 ? 'aron' : 'ó'}</span>
              )}
              {product.stock !== null && product.stock <= 5 && product.stock > 0 && (
                <span className="low-stock-badge" style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Zap size={16} color="#e5b62b" /> ¡Solo quedan {product.stock}!</span>
              )}
              {product.stock === 0 && (
                <span className="no-stock-badge" style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Frown size={16} /> Sin stock por el momento</span>
              )}
            </div>
            
            {/* Trust Badges Minimal */}
            {isLaunched && (
              <div className="trust-badges">
                <span><CreditCard size={16} className="mr-1" style={{marginRight: '6px'}} /> Pagos Seguros MP</span>
                <span><Truck size={16} className="mr-1" style={{marginRight: '6px'}} /> Envíos por Andreani</span>
                <span><ShieldCheck size={16} className="mr-1" style={{marginRight: '6px'}} /> Compra Protegida</span>
              </div>
            )}
            
            {/* Comparison Table */}
            {isLaunched && (product.category === 'Mates' || product.category === 'Materas y Yerberas') && (
              <div style={{margin: '1.5rem 0', padding: '1rem', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)'}}>
                <h4 style={{margin: '0 0 1rem 0', fontSize: '0.95rem'}}>¿Por qué elegir Cóndor Mates?</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', fontSize: '0.85rem', textAlign: 'center'}}>
                  <div style={{fontWeight: 'bold', color: 'var(--text-light)', textAlign: 'left', paddingBottom: '4px', borderBottom: '1px solid var(--border)'}}>Característica</div>
                  <div style={{fontWeight: 'bold', color: 'var(--accent)', paddingBottom: '4px', borderBottom: '1px solid var(--border)'}}>En Cóndor 🦅</div>
                  <div style={{fontWeight: 'bold', color: 'var(--text-light)', paddingBottom: '4px', borderBottom: '1px solid var(--border)'}}>Otros ❌</div>
                  
                  <div style={{textAlign: 'left', paddingTop: '4px'}}>Materiales</div>
                  <div style={{paddingTop: '4px'}}>Premium</div>
                  <div style={{paddingTop: '4px'}}>Estándar</div>

                  <div style={{textAlign: 'left', paddingTop: '4px'}}>Garantía</div>
                  <div style={{paddingTop: '4px'}}>30 Días (Cambio)</div>
                  <div style={{paddingTop: '4px'}}>Sin garantía</div>

                  <div style={{textAlign: 'left', paddingTop: '4px'}}>Terminaciones</div>
                  <div style={{paddingTop: '4px'}}>Costuras a mano</div>
                  <div style={{paddingTop: '4px'}}>Pegados</div>
                </div>
              </div>
            )}

            <div className="detail-cta-row">
              {isLaunched && (
                <button 
                  className="add-to-cart-large" 
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}
                  style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}
                >
                  {product.stock === 0 ? 'Sin Stock' : <><ShoppingCart size={20} /> Agregar al Carrito</>}
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
            {isLaunched && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f0f9f0', border: '1px solid #c2e0c6', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e4620', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <ShieldCheck size={18} style={{flexShrink: 0, marginTop: '2px'}} />
                  <span>Garantía Cóndor 30 Días: Cobertura total por cualquier defecto. Te mandamos un mate de reemplazo de igual valor al instante, sin vueltas.</span>
                </p>
              </div>
            )}
            {isLaunched && <p className="secure-checkout-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}><Lock size={14} /> Pagos procesados encriptados via Mercado Pago</p>}

            {/* Calculador Envío */}
            {isLaunched && (
              <div className="shipping-calculator">
                <h4 style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Package size={18} /> Calcular opciones de envío</h4>
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
                  <div className="shipping-result fade-in" style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {shippingResult.map(opt => (
                      <div key={opt.id} style={{padding: '8px', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)'}}>
                        <p style={{margin: 0, fontWeight: 'bold'}}>{opt.name}</p>
                        <p style={{margin: 0, color: 'var(--text-light)', fontSize: '0.9rem'}}>
                          {opt.cost === 0 ? 'Gratis' : `$${opt.cost.toLocaleString()}`}
                        </p>
                      </div>
                    ))}
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
                  <div className="accordion-content fade-in">
                    <p>Cada pieza es seleccionada con criterio por nuestro equipo, buscando siempre la mejor calidad y durabilidad para tu ritual matero. Curado y terminado bajo estándares de excelencia.</p>
                  </div>
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
            {isLaunched && bundleItems.length > 0 && (
              <div className="bundle-section fade-in">
                <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                   <Sparkles size={20} color="#e5b62b" /> Armá tu Kit Perfecto
                </h3>
                <p className="bundle-desc">Llevate el kit completo hoy y ahorrá un 20% extra pagando por transferencia.</p>
                <div className="bundle-items">
                  <div className="bundle-item main">
                    <img src={getImgUrl(product.image_url, { w: 150, q: 60 })} alt="Mate" />
                    <span>Tu Mate</span>
                  </div>
                  
                  {bundleItems.map(item => (
                    <React.Fragment key={item.id}>
                      <span className="bundle-plus">+</span>
                      <div className="bundle-item addon">
                        <img src={getImgUrl(item.image_url, { w: 150, q: 60 })} alt={item.name} />
                        <div className="bundle-addon-info">
                          <strong>{item.name}</strong>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', textDecoration: 'line-through', color: '#999' }}>Normalmente ${(item.promo_price || item.price).toLocaleString()}</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Hoy ${Math.round((item.promo_price || item.price) * 0.8).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <button className="add-bundle-btn" onClick={handleBundleAdd} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                  <ShoppingCart size={20} /> Sumar Kit Completo al Carrito
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
                    <option value={5}>5 Estrellas (Excelente)</option>
                    <option value={4}>4 Estrellas (Muy Bueno)</option>
                    <option value={3}>3 Estrellas (Bueno)</option>
                    <option value={2}>2 Estrellas (Regular)</option>
                    <option value={1}>1 Estrella (Malo)</option>
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
          
          {gallery.length > 1 && (
            <>
              <button 
                className="zoom-nav-btn zoom-prev" 
                onClick={(e) => {
                  e.stopPropagation();
                  const newIdx = (activeImageIdx - 1 + gallery.length) % gallery.length;
                  setActiveImageIdx(newIdx);
                  setActiveImage(gallery[newIdx]);
                }}
                aria-label="Imagen anterior"
              >
                ‹
              </button>
              <button 
                className="zoom-nav-btn zoom-next" 
                onClick={(e) => {
                  e.stopPropagation();
                  const newIdx = (activeImageIdx + 1) % gallery.length;
                  setActiveImageIdx(newIdx);
                  setActiveImage(gallery[newIdx]);
                }}
                aria-label="Imagen siguiente"
              >
                ›
              </button>
            </>
          )}

          <img 
            src={activeImage} 
            alt={product.name} 
            className="zoom-lightbox-image" 
            onClick={e => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
}

export default ProductDetail;
