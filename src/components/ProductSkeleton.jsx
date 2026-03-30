import React from 'react';
import './ProductSkeleton.css';

export const ProductCardSkeleton = () => {
  return (
    <div className="product-card skeleton-card">
      <div className="skeleton-image shimmer"></div>
      <div className="product-info skeleton-info">
        <div className="skeleton-title shimmer"></div>
        <div className="skeleton-price shimmer"></div>
        <div className="skeleton-transfer-box shimmer">
          <div className="skeleton-transfer-amount shimmer-dark"></div>
          <div className="skeleton-transfer-text shimmer-dark"></div>
        </div>
        <div className="skeleton-button shimmer"></div>
      </div>
    </div>
  );
};

export const ProductDetailSkeleton = () => {
  return (
    <div className="container main-content fade-in">
      <div className="shimmer skeleton-back-btn" style={{ width: '150px', height: '20px', marginBottom: '20px', borderRadius: '4px' }}></div>
      <div className="product-detail-layout">
        <div className="product-gallery">
          <div className="main-image-container shimmer" style={{ borderRadius: '8px', minHeight: '400px' }}></div>
        </div>
        <div className="product-info skeleton-detail-info">
          <div className="shimmer skeleton-title" style={{ width: '80%', height: '36px', marginBottom: '16px', borderRadius: '4px' }}></div>
          <div className="shimmer skeleton-price" style={{ width: '40%', height: '28px', marginBottom: '16px', borderRadius: '4px' }}></div>
          <div className="shimmer" style={{ width: '60%', height: '20px', marginBottom: '24px', borderRadius: '4px' }}></div>
          
          <div className="shimmer" style={{ width: '100%', height: '60px', marginBottom: '16px', borderRadius: '8px' }}></div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <div className="shimmer" style={{ flex: 1, height: '50px', borderRadius: '8px' }}></div>
            <div className="shimmer" style={{ width: '50px', height: '50px', borderRadius: '8px' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
