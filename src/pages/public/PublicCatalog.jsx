import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import ProductCard from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';
import { Helmet } from 'react-helmet-async';

function PublicCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const { cartCount, setIsCartOpen, addToCart } = useCart();
  
  const [currentCategory, setCurrentCategory] = useState('All');
  const [mateSubCategory, setMateSubCategory] = useState('All');
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // newest, price_asc, price_desc
  
  // Theme Management
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('mate_theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('mate_theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('mate_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    fetchPublicProducts();
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

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
    // Newest is already handled by Supabase default order, but we enforce it just in case
    visibleProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const crossSells = products.filter(p => p.category === 'Yerbas' || p.category === 'Bombillas').slice(0, 2);

  return (
    <>
      <Header 
        cartCount={cartCount} 
        onCartClick={() => setIsCartOpen(true)} 
        onNavClick={(cat, subCat = 'All') => {
          setCurrentCategory(cat);
          setMateSubCategory(subCat);
          setSearchTerm(''); // clear search on nav
        }}
        currentCategory={currentCategory}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />
      
      <main className="container main-content">
        {currentCategory === 'Nosotros' ? (
          <div className="page-section fade-in modern-layout">
            <div className="capsule-hero">
              <span className="badge-modern">Sobre nosotros</span>
              <h2 className="title-modern">Conocé a <br/><span className="text-gradient">Mate Loko</span></h2>
            </div>
            <div className="capsule-grid">
              <div className="capsule green-dark">
                <h3>Nuestra Pasión</h3>
                <p>Llevar la mejor experiencia matera a cada rincón del país, cuidando exactamente cada detalle de la tradición.</p>
              </div>
              <div className="capsule green-light">
                <h3>Artesanos Locales</h3>
                <p>Trabajamos mano a mano con creadores regionales para asegurar auténtica calidad en la calabaza y el cuero.</p>
              </div>
              <div className="capsule green-accent">
                <span className="huge-text">100%</span>
                <h3>Originalidad</h3>
                <p>Diseño propio pensado para tu día a día.</p>
              </div>
            </div>
          </div>
        ) : currentCategory === 'Envios' ? (
          <div className="page-section fade-in modern-layout">
            <div className="capsule-hero">
              <span className="badge-modern">Logística</span>
              <h2 className="title-modern">Tus mates,<br/><span className="text-gradient">a tu puerta</span></h2>
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
          <div className="fade-in">
            {currentCategory === 'All' && !searchTerm && (
              <div className="hero-banner fade-in">
                <div className="hero-content">
                  <span className="hero-badge">📦 Envíos al instante + Regalo</span>
                  <h1 className="hero-title">Elevá tu ritual<br/>de cada mañana.</h1>
                  <p className="hero-subtitle">Mates artesanales, bombillas y accesorios premium. Diseñados con pasión para conectarte con la verdadera tradición en cada cebada.</p>
                </div>
              </div>
            )}
            
            <div className="catalog-header">
              <div className="catalog-title-bar">
                <h2>
                  {currentCategory === 'All' 
                    ? 'Catálogo' 
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
              <p>Cargando catálogo...</p>
            ) : visibleProducts.length === 0 ? (
              <p>No hay productos que coincidan con la búsqueda.</p>
            ) : (
              <div className="product-grid">
                {visibleProducts.map(product => (
                  <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
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
