import React from 'react';
import { FRIENDS_WEEK_CONFIG } from '../data/friendsWeekData';
import './FriendsWeekPromoSection.css';

/**
 * FriendsWeekPromoSection — Temporary promotional section for "Semana del Amigo".
 *
 * Renders a split layout with a lifestyle hero image on the left and
 * promo product cards on the right. Products are filtered by the
 * `is_friends_week_promo` flag set from the admin panel.
 *
 * @param {Object} props
 * @param {Array}  props.products    – Full product list from React Query
 * @param {Function} props.onAddToCart – addToCart function from CartContext
 */
const FriendsWeekPromoSection = ({ products, onAddToCart }) => {
  // Filter products flagged as Friends Week promos (in stock only)
  const promoProducts = products.filter(
    (p) => p.is_friends_week_promo && p.stock !== 0
  );

  // Don't render anything if no products are marked
  if (promoProducts.length === 0) return null;

  const { sectionTitle, sectionSubtitle, ctaText, badgeText, heroImage } =
    FRIENDS_WEEK_CONFIG;

  return (
    <section className="fw-section fade-in" id="friends-week-section">
      <div className="fw-container">
        {/* Section header */}
        <div className="fw-header">
          <span className="fw-badge">{badgeText}</span>
          <h2 className="fw-title">
            <span className="fw-title-accent">{sectionTitle}</span>
          </h2>
          <p className="fw-subtitle">{sectionSubtitle}</p>
        </div>

        {/* Split layout */}
        <div className="fw-grid">
          {/* Left: Lifestyle hero image */}
          <div className="fw-hero-image">
            <img
              src={heroImage}
              alt="Dos mates compartidos al atardecer en el campo"
              loading="lazy"
            />
            <div className="fw-hero-image-overlay" />
            <span className="fw-hero-image-label">Edición limitada</span>
          </div>

          {/* Right: Promo cards */}
          <div className="fw-cards">
            {promoProducts.map((product) => {
              const hasPromo =
                product.promo_price &&
                product.promo_price < product.price;
              const displayPrice = hasPromo
                ? product.promo_price
                : product.price;
              const discount = hasPromo
                ? Math.round(
                    (1 - product.promo_price / product.price) * 100
                  )
                : 0;
              const transferPrice = Math.round(displayPrice * 0.8);

              return (
                <div className="fw-card" key={product.id}>
                  <div className="fw-card-image">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                    />
                  </div>

                  <div className="fw-card-body">
                    <h3 className="fw-card-name">{product.name}</h3>

                    <div className="fw-card-prices">
                      {hasPromo && (
                        <span className="fw-card-original-price">
                          ${product.price.toLocaleString()}
                        </span>
                      )}
                      <span className="fw-card-promo-price">
                        ${displayPrice.toLocaleString()}
                      </span>
                      {discount > 0 && (
                        <span className="fw-card-discount">
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    <p className="fw-card-transfer">
                      Transferencia:{' '}
                      <strong>${transferPrice.toLocaleString()}</strong>
                    </p>

                    <button
                      className="fw-card-cta"
                      onClick={() => onAddToCart(product)}
                      aria-label={`Agregar ${product.name} al carrito`}
                    >
                      {ctaText}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FriendsWeekPromoSection;
