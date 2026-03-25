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
      console.error('Error fetching products:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto?')) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Products</h1>
        <Link to="/admin/products/new" className="btn-primary">Add New Product</Link>
      </div>

      <div className="table-container">
        {loading ? (
          <p>Loading products...</p>
        ) : products.length === 0 ? (
          <p>No products found. Start by adding one!</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Category</th>
                <th>Price</th>
                <th>Upsell</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td>
                    <img src={product.image_url} alt={product.name} className="table-thumbnail" />
                  </td>
                  <td>{product.name}</td>
                  <td>
                    <span className="badge">{product.category}</span>
                    {product.sub_category && <span className="badge-outline">{product.sub_category}</span>}
                  </td>
                  <td>${product.price?.toLocaleString()}</td>
                  <td>{product.quick_add_upsell ? '✅' : '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <Link to={`/admin/products/${product.id}`} className="btn-icon">Edit</Link>
                      <button onClick={() => handleDelete(product.id)} className="btn-icon text-danger">Delete</button>
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
