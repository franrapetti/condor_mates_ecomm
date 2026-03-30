import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useLaunchTimer } from '../hooks/useLaunchTimer';
import { Heart } from 'lucide-react';
import './ProductCard.css';

const ProductCard = ({ product, onAddToCart }) => {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { isLaunched } = useLaunchTimer();
  const wishlisted = isWishlisted(product.id);

  return (
    <div className="product-card">
      <div className="product-image-container">
        <Link to={`/producto/${product.id}`}>
          <img src={product.image_url} alt={product.name} loading="lazy" decoding="async" />
        </Link>
        {(product.category === 'Mates' || product.sub_category === 'Bombillones de Alpaca') && (
          <span className="packaging-badge">🎁 Packaging Incluido</span>
        )}
        <button
          className={`wishlist-btn ${wishlisted ? 'wishlisted' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product);
          }}
          title={wishlisted ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          aria-label="Toggle favorito"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {wishlisted ? <Heart size={18} fill="currentColor" strokeWidth={1.5} /> : <Heart size={18} strokeWidth={1.5} />}
        </button>
      </div>
      <div className="product-info">
        <Link to={`/producto/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="product-title">{product.name}</h3>
        </Link>
        {isLaunched && (
          <>
            {product.promo_price ? (
              <div className="product-price-block">
                <span className="product-price-promo">${product.promo_price.toLocaleString()}</span>
                <span className="product-price-original">${product.price.toLocaleString()}</span>
                <span className="discount-badge">{Math.round((1 - product.promo_price / product.price) * 100)}% OFF</span>
              </div>
            ) : (
              <p className="product-price">${product.price.toLocaleString()}</p>
            )}
            {/* Precio con transferencia */}
            <div className="transfer-price-container">
              <div className="transfer-price-amount">${Math.round((product.promo_price || product.price) * 0.9).toLocaleString()}</div>
              <div className="transfer-price-text">abonando con transferencia</div>
            </div>

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
              {product.stock === 0 ? 'Sin Stock' : 'Agregar al carrito'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
