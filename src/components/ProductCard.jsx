import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import './ProductCard.css';

const ProductCard = ({ product, onAddToCart }) => {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  return (
    <div className="product-card">
      <div className="product-image-container">
        <Link to={`/producto/${product.id}`}>
          <img src={product.image_url} alt={product.name} />
        </Link>
        <span className="packaging-badge">🎁 Packaging Incluido</span>
        <button
          className={`wishlist-btn ${wishlisted ? 'wishlisted' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product);
          }}
          title={wishlisted ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          aria-label="Toggle favorito"
        >
          {wishlisted ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="product-info">
        <Link to={`/producto/${product.id}`} style={{textDecoration: 'none', color: 'inherit'}}>
          <h3 className="product-title">{product.name}</h3>
        </Link>
        <p className="product-price">${product.price.toLocaleString()}</p>
        {product.stock !== null && product.stock !== undefined && product.stock <= 3 && product.stock > 0 && (
          <span className="low-stock-pill">⚡ Últimas {product.stock} unidades</span>
        )}
        {product.stock === 0 && (
          <span className="no-stock-pill">😔 Sin stock</span>
        )}
        <button
          className="add-to-cart-btn"
          onClick={() => onAddToCart(product)}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? 'Sin Stock' : 'Agregar al Carrito'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
