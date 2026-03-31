import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="dev-footer">
      <div className="dev-footer-content">
        <p>
          Hecho con ❤️ por{' '}
          <a 
            href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '543572595756'}?text=${encodeURIComponent("Hola Francisco, me gustó mucho tu web. ¡Me gustaría que me armes una página!")}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="dev-link"
          >
            Francisco Rapetti
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
