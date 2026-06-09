import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Filter } from 'lucide-react';
import './ScreenshotCatalog.css';

const CATEGORIES = [
  { value: 'Yerbas', emoji: '🧉' },
  { value: 'Bombillas', emoji: '🥄' },
  { value: 'Mates', emoji: '🫖' },
];

const BASE_DOMAIN = 'https://condormates.com.ar';
const ensureAbsoluteUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${BASE_DOMAIN}${path}`;
};

const ScreenshotCatalog = () => {
  const [selected, setSelected] = useState(new Set(CATEGORIES.map(c => c.value)));
  const [productsByCategory, setProductsByCategory] = useState({});
  const [loading, setLoading] = useState(true);

  // Restauramos el aislamiento, lo activamos solo si hay productos mostrándose 
  // para que el usuario no vea "pantalla en blanco" si se pierden los estilos.
  useEffect(() => {
    document.body.classList.add('screenshot-view-active');
    return () => {
      document.body.classList.remove('screenshot-view-active');
    };
  }, []);

  const toggleCategory = (cat) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === CATEGORIES.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(CATEGORIES.map((c) => c.value)));
    }
  };

  const allSelected = selected.size === CATEGORIES.length;

  const fetchProducts = useCallback(async () => {
    if (selected.size === 0) {
      setProductsByCategory({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, price, image_url, category, stock')
        .in('category', Array.from(selected))
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      const productList = data || [];
      
      const grouped = productList.reduce((acc, product) => {
        const cat = product.category || 'Otros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(product);
        return acc;
      }, {});

      const ordered = {};
      const priority = ['Yerbas', 'Bombillas', 'Mates'];
      
      priority.forEach(cat => {
        if (grouped[cat]) {
          ordered[cat] = grouped[cat];
          delete grouped[cat];
        }
      });

      Object.assign(ordered, grouped);

      setProductsByCategory(ordered);
    } catch (err) {
      console.error('Error al cargar productos para capturas:', err);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="screenshot-catalog-container">
      
      {/* Panel de Filtros */}
      <div className="screenshot-filters">
        <h2 className="screenshot-filter-title">
          <Filter size={16} /> Filtros de Categoría
        </h2>
        
        <button className="screenshot-btn-all" onClick={toggleAll} type="button">
          {allSelected ? '✕ Ocultar todo' : '☑ Mostrar todo'}
        </button>

        <div className="screenshot-checkbox-group">
          {CATEGORIES.map(({ value, emoji }) => (
            <label
              key={value}
              className={`screenshot-checkbox-label ${selected.has(value) ? 'checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={selected.has(value)}
                onChange={() => toggleCategory(value)}
              />
              {emoji} {value}
            </label>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', fontSize: '20px' }}>
          Cargando catálogo para capturas...
        </div>
      ) : Object.keys(productsByCategory).length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', fontSize: '20px' }}>
          No hay productos seleccionados para mostrar.
        </div>
      ) : (
        Object.entries(productsByCategory).map(([category, products]) => (
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
        ))
      )}
    </div>
  );
};

export default ScreenshotCatalog;
