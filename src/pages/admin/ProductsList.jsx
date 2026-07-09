import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import ProductHeatmap from '../../components/admin/ProductHeatmap';
import './AdminProducts.css';

const ProductsList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const navigate = useNavigate();

  const [showRestockForm, setShowRestockForm] = useState(false);
  const [restockSearch, setRestockSearch] = useState('');
  const [restockSuggestions, setRestockSuggestions] = useState([]);
  const [showRestockSuggestions, setShowRestockSuggestions] = useState(false);
  const [restockLines, setRestockLines] = useState([]);
  const [savingRestock, setSavingRestock] = useState(false);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (restockSearch.length < 2) {
      setRestockSuggestions([]);
      return;
    }
    const term = restockSearch.toLowerCase();
    const filtered = products.filter(p => p.name?.toLowerCase().includes(term));
    setRestockSuggestions(filtered.slice(0, 8));
  }, [restockSearch, products]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowRestockSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addRestockLine = (product) => {
    if (restockLines.find(l => l.id === product.id)) {
      setRestockLines(prev => prev.map(l => l.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
    } else {
      setRestockLines(prev => [...prev, { id: product.id, name: product.name, quantity: 1, currentStock: product.stock || 0 }]);
    }
    setRestockSearch('');
    setShowRestockSuggestions(false);
  };

  const updateRestockQuantity = (id, newQ) => {
    setRestockLines(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, quantity: Math.max(1, newQ) };
      }
      return l;
    }));
  };

  const removeRestockLine = (id) => {
    setRestockLines(prev => prev.filter(l => l.id !== id));
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (restockLines.length === 0) return;
    setSavingRestock(true);
    
    try {
      for (const line of restockLines) {
        const { data: dbProduct } = await supabase.from('products').select('stock').eq('id', line.id).single();
        if (dbProduct) {
          await supabase.from('products').update({ stock: (dbProduct.stock || 0) + line.quantity }).eq('id', line.id);
        }
      }
      alert('Stock ingresado correctamente.');
      setShowRestockForm(false);
      setRestockLines([]);
      fetchProducts();
    } catch (err) {
      alert('Error al ingresar stock: ' + err.message);
    } finally {
      setSavingRestock(false);
    }
  };

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
            onClick={() => setShowRestockForm(!showRestockForm)}
            style={{
              background: 'var(--text-dark)', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 600,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              fontSize: '0.875rem'
            }}
          >
            {showRestockForm ? '✕ Cancelar' : '+ Ingreso de Mercadería'}
          </button>
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

      {showRestockForm && (
        <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 12, marginBottom: '2rem', border: '1px solid var(--border)'}}>
          <h3 style={{marginTop: 0}}>📦 Ingreso de Mercadería en Masa</h3>
          <form onSubmit={handleRestockSubmit}>
            <div style={{position: 'relative', marginBottom: '1rem'}} ref={suggestionsRef}>
              <input
                type="text"
                placeholder="🔍 Buscar producto para agregar stock..."
                value={restockSearch}
                onChange={e => { setRestockSearch(e.target.value); setShowRestockSuggestions(true); }}
                onFocus={() => restockSearch.length >= 2 && setShowRestockSuggestions(true)}
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid var(--border)', 
                  background: 'var(--background)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                }}
              />
              {showRestockSuggestions && restockSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  maxHeight: 240, overflowY: 'auto', marginTop: 4
                }}>
                  {restockSuggestions.map(p => (
                    <div
                      key={p.id}
                      onClick={() => addRestockLine(p)}
                      style={{
                        padding: '0.7rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', 
                        alignItems: 'center', borderBottom: '1px solid var(--border)', transition: 'background 0.1s', fontSize: '0.88rem'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(35, 74, 46, 0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{fontWeight: 600, color: 'var(--text-dark)'}}>{p.name}</span>
                      <span style={{fontWeight: 700, color: 'var(--text-light)', fontSize: '0.85rem'}}>
                        Stock actual: {p.stock ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {restockLines.length > 0 && (
              <div style={{marginBottom: '1.5rem', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden'}}>
                {restockLines.map(line => (
                  <div key={line.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.88rem', gap: '0.5rem', flexWrap: 'wrap'
                  }}>
                    <div style={{display: 'flex', flexDirection: 'column', minWidth: '150px', flex: 1}}>
                      <span style={{fontWeight: 600}}>{line.name}</span>
                      <span style={{fontSize: '0.75rem', color: 'var(--text-light)'}}>Stock actual: {line.currentStock}</span>
                    </div>
                    
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <span style={{fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-light)', marginRight: '0.5rem'}}>Ingresan:</span>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.3rem'}}>
                        <button type="button" onClick={() => updateRestockQuantity(line.id, line.quantity - 1)}
                          style={{width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)'}}
                        >−</button>
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={e => updateRestockQuantity(line.id, parseInt(e.target.value) || 1)}
                          style={{width: '50px', textAlign: 'center', padding: '0.2rem', borderRadius: 4, border: '1px solid var(--border)'}}
                          min="1"
                        />
                        <button type="button" onClick={() => updateRestockQuantity(line.id, line.quantity + 1)}
                          style={{width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)'}}
                        >+</button>
                      </div>
                      <span style={{fontWeight: 700, color: 'var(--accent)', minWidth: 60, textAlign: 'right', fontSize: '0.8rem', marginLeft: '0.5rem'}}>
                        Quedarán: {line.currentStock + line.quantity}
                      </span>
                      <button type="button" onClick={() => removeRestockLine(line.id)}
                        style={{background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem', padding: '0 0.2rem', marginLeft: '0.5rem'}}
                      >🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={savingRestock || restockLines.length === 0} style={{maxWidth: 220}}>
              {savingRestock ? 'Guardando...' : '✓ Confirmar Ingreso'}
            </button>
          </form>
        </div>
      )}

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
