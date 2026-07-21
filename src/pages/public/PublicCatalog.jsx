import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import Header from '../../components/Header';
import ProductCard from '../../components/ProductCard';
import ProductCardSkeleton from '../../components/ProductSkeleton';
import CountdownTimer from '../../components/CountdownTimer';
import { useLaunchTimer } from '../../hooks/useLaunchTimer';
import { useCart } from '../../context/CartContext';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getImgUrl } from '../../lib/imageUtils';
import { trackPixelEvent, logAnalyticsEvent } from '../../lib/analytics';
import { ShieldCheck, Star, Truck, CreditCard, BadgeCheck } from 'lucide-react';
import { FRIENDS_WEEK_ACTIVE } from '../../data/friendsWeekData';
import FriendsWeekPromoSection from '../../components/FriendsWeekPromoSection';

function PublicCatalog() {
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
  const searchDebounceRef = useRef(null);
  
  // Track catalog view on mount
  useEffect(() => {
    logAnalyticsEvent('view_catalog');
  }, []);
  
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

  const { data: products = [], isLoading: loading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });
  
  let visibleProducts = [...products];
  
  if (currentCategory !== 'All') {
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

  // Push out-of-stock products to the end (all sort modes)
  const inStock = visibleProducts.filter(p => p.stock !== 0);
  const outOfStock = visibleProducts.filter(p => p.stock === 0);
  visibleProducts = [...inStock, ...outOfStock];

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
        <meta property="og:description" content="Buscamos los mejores mates para tu ritual. Torpedos, Imperiales y más. ¡Armá tu combo y llevate hasta 30% OFF!" />
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
              <span className="hero-badge">📦 Envíos Rápidos + Regalo Valor $3,500</span>
              <h1 className="hero-fullbleed-title">Renová tu mate hoy con hasta <span className="handwriting-accent">30% OFF.</span></h1>
              <p className="hero-fullbleed-subtitle">Acumulá descuentos de combos y pago por transferencia. El mejor regalo para vos o para alguien especial.</p>
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
            <div className="trust-bar-container">
              <div className="trust-bar-item">
                <div className="trust-icon-wrapper">
                  <BadgeCheck size={20} color="#2ea337" />
                </div>
                <div className="trust-text-wrapper">
                  <div className="trust-title">
                    +{870 + products.reduce((acc, p) => acc + (p.sold_count || 0), 0)} ventas
                    <span className="verified-badge">Verificado</span>
                  </div>
                  <span className="trust-subtitle">en todo el país</span>
                </div>
              </div>
              
              <div className="trust-bar-item">
                <div className="trust-icon-wrapper">
                  <Star size={20} fill="#e5b62b" color="#e5b62b" />
                </div>
                <div className="trust-text-wrapper">
                  <div className="trust-title">4.9/5 Estrellas</div>
                  <span className="trust-subtitle">de satisfacción</span>
                </div>
              </div>
              
              <div className="trust-bar-item">
                <div className="trust-icon-wrapper">
                  <Truck size={20} color="#2663eb" />
                </div>
                <div className="trust-text-wrapper">
                  <div className="trust-title">Envíos rápidos</div>
                  <span className="trust-subtitle">por Andreani</span>
                </div>
              </div>
              
              <div className="trust-bar-item">
                <div className="trust-icon-wrapper">
                  <CreditCard size={20} color="#454545" />
                </div>
                <div className="trust-text-wrapper">
                  <div className="trust-title">Pagos seguros</div>
                  <span className="trust-subtitle">por Mercado Pago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Semana del Amigo — Temporal promo section */}
          {FRIENDS_WEEK_ACTIVE && (
            <FriendsWeekPromoSection
              products={products}
              onAddToCart={addToCart}
            />
          )}

          {/* Categories Preview Grid */}
          <div className="container" style={{ marginTop: '3.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '2.5rem', fontWeight: 800, color: 'var(--accent)' }}>Explorá nuestras colecciones</h2>
            <div className="mobile-categories-scroll">
              {Object.values(
                products.reduce((acc, p) => {
                  if (!acc[p.category] || p.price > acc[p.category].price) {
                    acc[p.category] = p;
                  }
                  return acc;
                }, {})
              ).filter(p => !['Nosotros', 'Envios'].includes(p.category)).map((catProduct) => (
                <div 
                  key={catProduct.category} 
                  onClick={() => {
                      setCurrentCategory(catProduct.category);
                      setTimeout(() => document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }}
                  className="group cursor-pointer text-center transition-all duration-300 hover:-translate-y-2"
                  style={{ width: '140px' }}
                >
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-[4px] border-solid border-[#ddd5c0] bg-[#FFFDF7] shadow-sm group-hover:shadow-lg group-hover:border-[#234A2E] transition-all duration-300">
                    <img 
                      src={catProduct.image_url} 
                      alt={catProduct.category} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  </div>
                  <h3 className="text-[1.05rem] font-bold text-[#1a1208] group-hover:text-[#234A2E] transition-colors">{catProduct.category}</h3>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {currentCategory === 'All' && !searchTerm && !isLaunched && (
        <main className="container main-content">
          <CountdownTimer />
        </main>
      )}

      <main className="container main-content" id="catalog-section">
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchTerm(val);

                      // Meta Pixel: Search event (debounced 800ms)
                      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                      if (val.trim().length >= 2) {
                        searchDebounceRef.current = setTimeout(() => {
                          trackPixelEvent('Search', {
                            search_string: val.trim(),
                            content_category: currentCategory !== 'All' ? currentCategory : undefined,
                          });
                          logAnalyticsEvent('search', { query: val.trim() });
                        }, 800);
                      }
                    }}
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
      </main>
    </>
  );
}

export default PublicCatalog;
