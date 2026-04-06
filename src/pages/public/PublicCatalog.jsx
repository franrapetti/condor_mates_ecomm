import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import ProductCard from '../../components/ProductCard';
import ProductCardSkeleton from '../../components/ProductSkeleton';
import CountdownTimer from '../../components/CountdownTimer';
import { useLaunchTimer } from '../../hooks/useLaunchTimer';
import { useCart } from '../../context/CartContext';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getImgUrl } from '../../lib/imageUtils';

function PublicCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  // Dynamic hero — start null to avoid flash while fetching from Supabase
  const [heroDesktop, setHeroDesktop] = useState(null);
  const [heroMobile, setHeroMobile] = useState(null);
  const [heroReady, setHeroReady] = useState(false);

  const { cartCount, setIsCartOpen, addToCart } = useCart();
  
  const location = useLocation();
  
  const [currentCategory, setCurrentCategory] = useState(location.state?.category || 'All');
  const [mateSubCategory, setMateSubCategory] = useState(location.state?.subCategory || 'All');
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // newest, price_asc, price_desc
  const { isLaunched } = useLaunchTimer();
  
  // Theme Management now handled by ThemeContext

  useEffect(() => {
    if (location.state?.category) {
      setCurrentCategory(location.state.category);
    }
    if (location.state?.subCategory) {
      setMateSubCategory(location.state.subCategory);
    }
  }, [location.state]);

  useEffect(() => {
    fetchPublicProducts();
    // Fetch hero images from site_settings — only show hero once resolved
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['hero_bg_url', 'hero_mobile_url'])
      .then(({ data }) => {
        if (data) {
          data.forEach(row => {
            if (row.key === 'hero_bg_url' && row.value) setHeroDesktop(row.value);
            if (row.key === 'hero_mobile_url' && row.value) setHeroMobile(row.value);
          });
        }
        // Fallback to static files if nothing loaded
        setHeroDesktop(prev => prev || '/hero-bg.png');
        setHeroMobile(prev => prev || '/hero-bg-mobile.png');
        setHeroReady(true);
      });
  }, []);

  // ...

  const fetchPublicProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  let visibleProducts = [...products];
  
  if (currentCategory === 'Nosotros' || currentCategory === 'Envios') {
    visibleProducts = [];
  } else if (currentCategory !== 'All') {
    visibleProducts = visibleProducts.filter(p => p.category === currentCategory);
    if (mateSubCategory !== 'All') {
      visibleProducts = visibleProducts.filter(p => p.sub_category === mateSubCategory);
    }
  }

  if (searchTerm) {
    visibleProducts = visibleProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  if (sortOrder === 'price_asc') {
    visibleProducts.sort((a, b) => a.price - b.price);
  } else if (sortOrder === 'price_desc') {
    visibleProducts.sort((a, b) => b.price - a.price);
  } else {
    // Advanced Default Sorting Logic
    // 1. Separate priority items
    let priorities = [];
    let others = [];
    
    visibleProducts.forEach(p => {
      if (p.is_priority) {
        priorities.push(p);
      } else {
        others.push(p);
      }
    });

    // Shuffle priorities to keep top section fresh
    priorities.sort(() => 0.5 - Math.random());
    
    // Sort others by sold_count (desc), fallback to newest
    others.sort((a, b) => {
      const countA = a.sold_count || 0;
      const countB = b.sold_count || 0;
      if (countA !== countB) return countB - countA;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    visibleProducts = [...priorities, ...others];
  }

  const crossSells = products.filter(p => p.category === 'Yerbas' || p.category === 'Bombillas').slice(0, 2);

  const scrollToCatalog = () => {
    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Helmet>
        <title>Cóndor Mates | Tu Ritual, Nuestra Pasión 🧉</title>
        <meta name="description" content="Descubrí la mejor selección de mates imperiales, torpedos, termos y accesorios premium. Envíos gratis a toda Argentina. Armá tu combo con descuento." />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.origin} />
        <meta property="og:title" content="Cóndor Mates | Tienda de Mates Premium" />
        <meta property="og:description" content="Buscamos los mejores mates para tu ritual. Torpedos, Imperiales y más. ¡Armá tu combo y llevate un 20% OFF!" />
        <meta property="og:image" content={heroDesktop || "/logo.png"} />
        <meta property="og:site_name" content="Cóndor Mates" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Cóndor Mates | Tienda de Mates Premium" />
        <meta name="twitter:description" content="Tu ritual, nuestra pasión. Envíos a todo el país." />
        <meta name="twitter:image" content={heroDesktop || "/logo.png"} />
      </Helmet>
      <Header 
        cartCount={cartCount} 
        onCartClick={() => setIsCartOpen(true)} 
        onNavClick={(cat, subCat = 'All') => {
          setCurrentCategory(cat);
          setMateSubCategory(subCat);
          setSearchTerm(''); // clear search on nav
        }}
        currentCategory={currentCategory}
      />

      {/* Full-bleed Hero — only on main catalog view */}
      {currentCategory === 'All' && !searchTerm && isLaunched && (
        <>
          <section
            className="hero-fullbleed"
            style={{
              position: 'relative',
              overflow: 'hidden',
              opacity: heroReady ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          >
            {/* Responsive background via <picture> — URLs loaded from admin settings */}
            <picture style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <source media="(min-width: 768px)" srcSet={heroDesktop ? getImgUrl(heroDesktop, { w: 1600, q: 75 }) : ''} />
              <img
                src={heroMobile ? getImgUrl(heroMobile, { w: 1000, h: 1200, q: 75, resize: 'cover' }) : ''}
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: '30% center', // Recorta el lado derecho en celulares
                  display: 'block',
                }}
                onError={(e) => { e.currentTarget.src = heroDesktop; }}
              />
            </picture>
            <div className="hero-fullbleed-overlay" />
            <div className="hero-fullbleed-content" style={{ position: 'relative', zIndex: 1 }}>
              <span className="hero-badge">📦 Envíos al instante + Regalo</span>
              <h1 className="hero-fullbleed-title">El arte de <span className="handwriting-accent">cebar.</span></h1>
              <p className="hero-fullbleed-subtitle">Mates, bombillas y accesorios premium. Seleccionados con criterio para conectarte con la verdadera tradición en cada cebada.</p>
              <div className="hero-buttons-container" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'nowrap', marginTop: '1.5rem', width: '100%' }}>
                <button className="hero-fullbleed-cta" onClick={scrollToCatalog} style={{ flex: 1, padding: '0.9rem 1rem', whiteSpace: 'nowrap', textAlign: 'center', fontWeight: 900 }}>
                  Catálogo ↓
                </button>
                <a
                  href="/combo"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: '8px',
                    padding: '0.9rem 1.2rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    transition: 'background 0.2s',
                    flex: 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  ✨ Combos
                </a>
              </div>
            </div>
          </section>


          {/* Trust Metrics Bar */}
          <div className="trust-bar fade-in">
            <div className="trust-bar-item">✅ <strong>+500 ventas</strong> concretadas</div>
            <div className="trust-bar-item">⭐ <strong>4.9/5</strong> de satisfacción</div>
            <div className="trust-bar-item">🚚 Envíos por <strong>Andreani</strong></div>
            <div className="trust-bar-item">💳 Pagos seguros por <strong>Mercado Pago</strong></div>
          </div>
        </>
      )}

      {currentCategory === 'All' && !searchTerm && !isLaunched && (
        <main className="container main-content">
          <CountdownTimer />
        </main>
      )}

      <main className="container main-content" id="catalog-section">
        {currentCategory === 'Nosotros' ? (
          <div className="page-section fade-in modern-layout">
            <div className="capsule-hero">
              <span className="badge-modern">Sobre nosotros</span>
              <h2 className="title-modern" style={{ fontWeight: 900 }}>Conocé a <br/><span className="text-gradient" style={{ fontWeight: 900 }}>Cóndor Mates</span></h2>
            </div>
            <div className="capsule-grid">
              <div className="capsule green-dark" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
                <img src="/img/francisco_portrait.jpg" alt="Francisco - Fundador" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }} onError={(e) => e.target.style.display='none'} />
                <div>
                  <h3 style={{ marginBottom: '0.5rem', fontWeight: 800 }}>Hola, soy Francisco 👋</h3>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                    Soy un apasionado del mate nacido en <strong>Río Segundo, Córdoba</strong>. En Cóndor Mates nacimos con una misión simple pero importante: llevar la mejor calidad y la verdadera mística de la cultura matera a cada rincón de Argentina. <br/><br/>
                    Yo personalmente selecciono y superviso cada pieza, asegurando que a tu casa llegue un producto premium, duradero y hecho con dedicación.
                  </p>
                </div>
              </div>
              <div className="capsule green-light">
                <span className="emoji-huge" style={{ justifyContent: 'center' }}>🇦🇷</span>
                <h3 style={{ textAlign: 'center' }}>Origen Cordobés</h3>
                <p style={{ textAlign: 'center' }}>De Río Segundo para todo el país con la mejor energía.</p>
              </div>
              <div className="capsule green-accent">
                <span className="emoji-huge" style={{ justifyContent: 'center' }}>🦅</span>
                <h3 style={{ textAlign: 'center' }}>El Cóndor</h3>
                <p style={{ textAlign: 'center' }}>Elegancia, altura y tradición en cada mate que armamos.</p>
              </div>
            </div>
          </div>
        ) : currentCategory === 'Envios' ? (
          <div className="page-section fade-in modern-layout">
            <div className="capsule-hero">
              <span className="badge-modern">Logística</span>
              <h2 className="title-modern" style={{ fontWeight: 900 }}><strong>Tus mates,</strong><br/><span className="text-gradient" style={{ fontWeight: 900 }}>a tu puerta</span></h2>
            </div>
            <div className="capsule-grid-2">
              <div className="capsule green-dark full-width">
                <h3>Envíos a Todo el País 🇦🇷</h3>
                <p>Tu pedido será preparado y despachado con máxima prioridad dentro de las 24 horas hábiles luego de confirmado tu pago. ¡Llegamos a donde estés!</p>
              </div>
              <div className="capsule border-style">
                <span className="emoji-huge">📦</span>
                <h3>Packaging Gratis</h3>
                <p>¡Todos nuestros productos incluyen packaging de regalo premium sin cargo extra! Llegar a casa o abrirlo enfrente de un amigo es toda una experiencia.</p>
              </div>
              <div className="capsule border-style">
                <span className="emoji-huge">⚡</span>
                <h3>Seguimiento Rápido</h3>
                <p>Te enviamos el código de rastreo por WhatsApp al instante de despachar el paquete.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="fade-in catalog-main-content">
            <div className="catalog-header">
              <div className="catalog-title-bar">
                <h2>
                  {currentCategory === 'All' 
                    ? (isLaunched ? 'Catálogo' : 'Elegí tus favoritos') 
                    : mateSubCategory !== 'All' 
                      ? `${mateSubCategory}` 
                      : currentCategory}
                </h2>
                
                <div className="catalog-controls">
                  <input 
                    type="search" 
                    placeholder="🔍 Buscar producto..." 
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select 
                    className="sort-select" 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="newest">Más nuevos</option>
                    <option value="price_asc">Menor precio</option>
                    <option value="price_desc">Mayor precio</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="product-grid fade-in">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <p>No hay productos que coincidan con la búsqueda.</p>
            ) : (
              <div className="product-grid">
                {visibleProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={addToCart} 
                    noZoom={product.no_zoom}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

export default PublicCatalog;
