import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Printer } from 'lucide-react';
import './PrintCatalog.css';

const BASE_DOMAIN = 'https://condormates.com.ar';

const ensureAbsoluteUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${BASE_DOMAIN}${path}`;
};

const PrintCatalog = () => {
  const [productsByCategory, setProductsByCategory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('name, price, image_url, category')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;

        // Group by category
        const grouped = data.reduce((acc, product) => {
          const cat = product.category || 'Otros';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(product);
          return acc;
        }, {});

        // Reorder specific categories to prioritize the main ones
        const ordered = {};
        const priority = ['Yerbas', 'Bombillas', 'Mates'];
        
        priority.forEach(cat => {
          if (grouped[cat]) {
            ordered[cat] = grouped[cat];
            delete grouped[cat];
          }
        });

        // Add any remaining categories
        Object.assign(ordered, grouped);

        setProductsByCategory(ordered);
      } catch (err) {
        console.error('Error al cargar productos para catálogo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando catálogo...</div>;
  }

  return (
    <div className="print-catalog-container">
      <div className="print-actions">
        <button className="print-btn" onClick={() => window.print()}>
          <Printer size={20} />
          Imprimir Catálogo (A4)
        </button>
      </div>

      <div className="print-catalog-header">
        <h1>Catálogo de Productos</h1>
      </div>

      {Object.entries(productsByCategory).map(([category, products]) => (
        <section key={category} className="print-category-section">
          <h2 className="print-category-title">{category}</h2>
          <div className="print-grid">
            {products.map((product, idx) => (
              <div key={idx} className="print-card">
                <img 
                  src={ensureAbsoluteUrl(product.image_url)} 
                  alt={product.name} 
                  className="print-card-img" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <h3 className="print-card-name">{product.name}</h3>
                <p className="print-card-price">${product.price?.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default PrintCatalog;
