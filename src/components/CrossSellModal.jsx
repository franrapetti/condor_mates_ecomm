import React from 'react';
import { Link } from 'react-router-dom';
import './CrossSellModal.css';

const CrossSellModal = ({ isOpen, onClose, onQuickAdd, crossSells = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>¡Excelente Elección!</h2>
        <p>¿Te gustaría agregar algo para acompañar tu mate?</p>
        
        <div className="cross-sell-items">
          {crossSells.map(item => (
            <div key={item.id} className="cross-sell-card">
              <Link to={`/producto/${item.id}`} onClick={onClose} style={{ textDecoration: 'none', color: 'inherit' }}>
                <img src={item.image_url} alt={item.name} />
              </Link>
              <div className="cross-sell-info">
                <Link to={`/producto/${item.id}`} onClick={onClose} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h4>{item.name}</h4>
                </Link>
                <p>${item.price?.toLocaleString()}</p>
                <button 
                  className="quick-add-btn"
                  onClick={() => {
                    onQuickAdd(item);
                    onClose();
                  }}
                >
                  + Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button className="continue-btn" onClick={onClose}>
          No, gracias. Ir al carrito.
        </button>
      </div>
    </div>
  );
};

export default CrossSellModal;
