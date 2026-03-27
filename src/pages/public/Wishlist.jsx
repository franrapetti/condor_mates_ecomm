import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '../../components/Header';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { Heart, Trash2 } from 'lucide-react';
import './Wishlist.css';

const Wishlist = () => {
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart, cartCount, setIsCartOpen } = useCart();
  const navigate = useNavigate();

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

  const toggleTheme = () => setIsDark(!isDark);

  const handleNavClick = (cat, subCat = 'All') => {
    navigate('/', { state: { category: cat, subCategory: subCat } });
  };

  return (
    <div className="public-wrapper">
      <Helmet>
        <title>Mis Favoritos | Cóndor Mates</title>
      </Helmet>
      <Header 
        cartCount={cartCount} 
        onCartClick={() => setIsCartOpen(true)} 
        onNavClick={handleNavClick}
        currentCategory="Favoritos"
        isDark={isDark}
        toggleTheme={toggleTheme}
      />

      <main className="wishlist-container">
        <div className="wishlist-header">
          <h1>❤️ Mis Favoritos</h1>
          <p>{wishlist.length > 0
            ? `Tenés ${wishlist.length} producto${wishlist.length > 1 ? 's' : ''} guardado${wishlist.length > 1 ? 's' : ''}.`
            : 'Todavía no guardaste ningún producto.'
          }</p>
        </div>

        {wishlist.length === 0 ? (
          <div className="empty-wishlist">
            <Heart size={64} color="var(--border)" strokeWidth={1} style={{marginBottom: '1rem'}} />
            <p>Tocá el corazoncito en cualquier producto del catálogo para guardarlo acá.</p>
            <Link to="/" className="btn-primary">Ver Catálogo</Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlist.map(product => (
              <div key={product.id} className="wishlist-card">
                  <button
                    className="remove-wishlist-btn"
                    onClick={() => toggleWishlist(product)}
                    title="Quitar de favoritos"
                  >
                    <Trash2 size={20} />
                  </button>
                <Link to={`/producto/${product.id}`}>
                  <img src={product.image_url} alt={product.name} className="wishlist-card-img" />
                </Link>
                <div className="wishlist-card-info">
                  <Link to={`/producto/${product.id}`} className="wishlist-card-name">
                    {product.name}
                  </Link>
                  <p className="wishlist-card-price">${product.price.toLocaleString()}</p>
                  <button
                    className="wishlist-add-btn"
                    onClick={() => addToCart(product)}
                  >
                    🛒 Agregar al Carrito
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Wishlist;
