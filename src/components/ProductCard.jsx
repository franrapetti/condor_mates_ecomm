import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useWishlist } from '../context/WishlistContext';
import { useLaunchTimer } from '../hooks/useLaunchTimer';
import { Heart, Star, Flame } from 'lucide-react';
import { getImgUrl } from '../lib/imageUtils';
import './ProductCard.css';

const IS_DEV = import.meta.env.DEV;

const ProductCard = ({ product, onAddToCart, noZoom }) => {
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { isLaunched } = useLaunchTimer();
  const wishlisted = isWishlisted(product.id);

  const handleProductClick = () => {
    supabase.rpc('increment_click_count', { product_id: product.id })
      .then(({ error }) => {
        if (error && IS_DEV) console.warn('[Analytics] increment_click_count failed:', error.message);
      })
      .catch((err) => {
        if (IS_DEV) console.warn('[Analytics] increment_click_count exception:', err);
      });
  };

  return (
    <div className="product-card">
      <div className={`product-image-container ${noZoom ? 'no-zoom' : ''}`}>
        <Link to={`/producto/${product.slug || product.id}`} onClick={handleProductClick}>
          <img 
            src={getImgUrl(product.image_url, { w: 400, q: 65 })} 
            alt={product.name} 
            loading="lazy" 
            decoding="async" 
          />
        </Link>
        <div className="top-left-badges">
          {product.best_seller && (
            <span className="best-seller-badge">
              <Flame size={12} fill="currentColor" strokeWidth={1} />
              MÁS VENDIDO
            </span>
          )}
          {isLaunched && (product.category === 'Mates' || product.sub_category === 'Bombillones de Alpaca') && (
            <span className="packaging-badge">🎁 Packaging Premium (Valor $3,500)</span>
          )}
        </div>
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
      {isLaunched && (
        <div className="product-info">
          <Link to={`/producto/${product.slug || product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3 className="product-title">{product.name}</h3>
          </Link>
          
          {product.reviews_count > 0 && (
            <div className="product-rating">
              <Star size={14} fill="#C6A87C" strokeWidth={0} />
              <span className="rating-value">{product.rating || '4.9'}</span>
              <span className="rating-count">({product.reviews_count})</span>
            </div>
          )}
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
              <div className="transfer-price-amount">${Math.round((product.promo_price || product.price) * 0.8).toLocaleString()}</div>
              <div className="transfer-price-text">con transferencia (20% OFF)</div>
            </div>

            {product.show_stock_alert && (
              <span className="low-stock-pill">🔥 Últimas unidades</span>
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
        </div>
      )}
    </div>
  );
};

export default ProductCard;
