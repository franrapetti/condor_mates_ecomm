import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ScreenshotCatalog.css';

const BASE_DOMAIN = 'https://condormates.com.ar';
const ensureAbsoluteUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${BASE_DOMAIN}${path}`;
};

const ScreenshotCatalog = () => {
  const [productsByCategory, setProductsByCategory] = useState({});
  const [loading, setLoading] = useState(true);

  // Agrega una clase al body para forzar la ocultación del layout en CSS globalmente
  /* useEffect(() => {
    document.body.classList.add('screenshot-view-active');
    return () => {
      document.body.classList.remove('screenshot-view-active');
    };
  }, []); */

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('name, price, image_url, category, stock')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;

        // Group by category
        const productList = data || [];
        const grouped = productList.reduce((acc, product) => {
          const cat = product.category || 'Otros';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(product);
          return acc;
        }, {});

        // Reorder specific categories
        const ordered = {};
        const priority = ['Yerbas', 'Bombillas', 'Mates'];
        
        priority.forEach(cat => {
          if (grouped[cat]) {
            ordered[cat] = grouped[cat];
            delete grouped[cat];
          }
        });

        // Add remaining
        Object.assign(ordered, grouped);

        setProductsByCategory(ordered);
      } catch (err) {
        console.error('Error al cargar productos para capturas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '20px' }}>Cargando catálogo para capturas...</div>;
  }

  if (Object.keys(productsByCategory).length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '20px' }}>No hay productos activos para mostrar.</div>;
  }

  return (
    <div className="screenshot-catalog-container">
      {Object.entries(productsByCategory).map(([category, products]) => (
        <section key={category} className="screenshot-category-section">
          <h2 className="screenshot-category-title">{category}</h2>
          
          <div className="screenshot-list">
            {products.map((product, idx) => (
              <div key={idx} className="screenshot-card">
                
                <div className="screenshot-card-left">
                  <img 
                    src={ensureAbsoluteUrl(product.image_url)} 
                    alt={product.name} 
                    className="screenshot-card-img" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                
                <div className="screenshot-card-right">
                  <h3 className="screenshot-card-name">{product.name}</h3>
                  <p className="screenshot-card-price">$ {product.price?.toLocaleString()}</p>
                  
                  <div className="screenshot-card-meta">
                    <span>Stock Disponible: {product.stock ?? 0}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ScreenshotCatalog;
