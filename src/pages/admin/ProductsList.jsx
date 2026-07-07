import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import ProductHeatmap from '../../components/admin/ProductHeatmap';
import './AdminProducts.css';

const ProductsList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error al obtener productos:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!window.confirm('¿Estás seguro que querés eliminar este producto?')) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const getStockBadge = (stock) => {
    if (stock === 0) return <span style={{background:'#fee2e2',color:'#dc2626',padding:'2px 8px',borderRadius:'10px',fontSize:'0.78rem',fontWeight:700}}>Sin stock</span>;
    if (stock <= 3) return <span style={{background:'#fff7ed',color:'#c2410c',padding:'2px 8px',borderRadius:'10px',fontSize:'0.78rem',fontWeight:700}}>{stock} ud. ⚠️</span>;
    return <span style={{background:'#e6fced',color:'#008a3d',padding:'2px 8px',borderRadius:'10px',fontSize:'0.78rem',fontWeight:700}}>{stock} ud.</span>;
  };

  const getStockBadgeMobile = (stock) => {
    if (stock === 0) return <span className="mobile-stock-badge no-stock">0</span>;
    if (stock <= 3) return <span className="mobile-stock-badge low-stock">{stock}</span>;
    return <span className="mobile-stock-badge ok-stock">{stock}</span>;
  };

  const categories = ['Todos', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = selectedCategory === 'Todos' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const totalStockValue = products.reduce((acc, p) => {
    const stock = p.stock || 0;
    const price = p.price || 0;
    const isGrabado = p.name && p.name.toLowerCase().includes('grabado');
    if (stock > 0 && price > 0 && !isGrabado) {
      return acc + (stock * price * 0.8);
    }
    return acc;
  }, 0);

  const copyYerbasPrices = () => {
    const yerbas = products.filter(p => p.category === 'Yerbas');
    if (yerbas.length === 0) {
      alert('No hay yerbas para copiar.');
      return;
    }
    
    let text = '🧉 *Lista de Yerbas (Precio Efectivo o Transferencia)*\n\n';
    yerbas.forEach(y => {
      text += `• ${y.name}: $${y.price?.toLocaleString()}\n`;
    });
    
    navigator.clipboard.writeText(text).then(() => {
      alert('¡Lista de yerbas copiada al portapapeles!');
    }).catch(err => {
      console.error('Error al copiar:', err);
      alert('Error al copiar la lista.');
    });
  };

  return (
    <div className="admin-page">
      <div className="adm-page-header" style={{ marginBottom: '1rem' }}>
        <div className="adm-page-title">
          <h1>Catálogo de Productos</h1>
          <span className="adm-count-pill">{products.length} artículos</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={copyYerbasPrices} 
            style={{ 
              background: 'white', 
              color: '#111827', 
              border: '1px solid #d1d5db', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              fontSize: '0.875rem'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Precios Yerbas
          </button>
          <Link to="/admin/products/new" className="btn-primary">+ Nuevo Producto</Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Valor Total de Stock (Transf.)
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-dark)' }}>
            ${Math.round(totalStockValue).toLocaleString()}
          </span>
        </div>
      </div>

      <ProductHeatmap products={products} />

      <div className="catalog-filters">
        {categories.map(cat => (
          <button 
            key={cat} 
            className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="table-container desktop-catalog">
        {loading ? (
          <p style={{padding: '1rem'}}>Cargando productos...</p>
        ) : filteredProducts.length === 0 ? (
          <p style={{padding: '1rem'}}>No hay productos en esta categoría.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Clicks</th>
                <th>Upsell</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id}>
                  <td>
                    <img src={product.image_url} alt={product.name} className="table-thumbnail" />
                  </td>
                  <td style={{fontWeight: 600}}>{product.name}</td>
                  <td>
                    <span className="badge">{product.category}</span>
                    {product.sub_category && <span className="badge-outline">{product.sub_category}</span>}
                  </td>
                  <td style={{fontWeight: 700}}>${product.price?.toLocaleString()}</td>
                  <td>{getStockBadge(product.stock ?? 0)}</td>
                  <td>{product.click_count || 0}</td>
                  <td>{product.quick_add_upsell ? '✅' : '—'}</td>
                  <td>
                    <div className="action-buttons">
                      <Link to={`/admin/products/${product.id}`} className="btn-icon">Editar</Link>
                      <button onClick={(e) => handleDelete(product.id, e)} className="btn-icon text-danger">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mobile-catalog-wrapper">
        {loading ? (
          <p style={{padding: '1rem'}}>Cargando productos...</p>
        ) : filteredProducts.length === 0 ? (
          <p style={{padding: '1rem'}}>No hay productos en esta categoría.</p>
        ) : (
          <div className="mobile-catalog-grid">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                className="mobile-product-card" 
                onClick={() => navigate(`/admin/products/${product.id}`)}
              >
                <div className="mobile-product-img-wrapper">
                  <img src={product.image_url} alt={product.name} loading="lazy" />
                  {getStockBadgeMobile(product.stock ?? 0)}
                  <div className="mobile-product-price">${product.price?.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsList;
