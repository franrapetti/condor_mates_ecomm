import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';
import './AdminProducts.css';

const ProductsList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (id) => {
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

  const topClickedProducts = [...products]
    .sort((a, b) => (b.click_count || 0) - (a.click_count || 0))
    .slice(0, 3);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="adm-page-title">
          <h1>Catálogo de Productos</h1>
          <span className="adm-count-pill">{products.length} artículos</span>
        </div>
        <Link to="/admin/products/new" className="btn-primary">+ Nuevo Producto</Link>
      </div>

      <div className="top-clicked-widget" style={{background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0'}}>
        <h3>🔥 Top Productos Más Visitados</h3>
        <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
          {topClickedProducts.map(p => (
            <div key={p.id} style={{fontSize: '0.9rem'}}>
              <strong>{p.name}</strong>: {p.click_count || 0} clics
            </div>
          ))}
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <p>Cargando productos...</p>
        ) : products.length === 0 ? (
          <p>No hay productos. ¡Empezá agregando uno!</p>
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
              {products.map(product => (
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
                      <button onClick={() => handleDelete(product.id)} className="btn-icon text-danger">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProductsList;
