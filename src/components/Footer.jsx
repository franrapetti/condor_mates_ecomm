import React from 'react';
import { Send, MapPin, Package, Heart } from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-grid">
        {/* Brand Section */}
        <div className="footer-brand">
          <img src="/logo-noche.png" alt="Cóndor Mates" className="footer-logo-img" />
          <p className="footer-tagline">
            Llevando la tradición del buen mate a cada rincón de Argentina con piezas seleccionadas por su calidad y mística.
          </p>
          <div className="social-links">
            <a href="https://instagram.com/condormates" target="_blank" rel="noopener noreferrer" className="social-icon-btn" title="Instagram">
              <InstagramIcon size={20} />
            </a>
            <a href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '543572595756'}`} target="_blank" rel="noopener noreferrer" className="social-icon-btn" title="WhatsApp">
              <Send size={20} />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-links-group">
          <h4>Navegación</h4>
          <a href="/#catalog-section" className="footer-link">Catálogo</a>
          <a href="/combo" className="footer-link">Armá tu Combo</a>
          <a href="/favoritos" className="footer-link">Mis Favoritos</a>
          <a href="/empresas" className="footer-link">Ventas Corporativas</a>
        </div>

        {/* Contact/Info */}
        <div className="footer-links-group">
          <h4>Cóndor Mates</h4>
          <div className="footer-link">
            <MapPin size={16} /> Río Segundo, Córdoba
          </div>
          <div className="footer-link">
            <Package size={16} /> Envíos a todo el país
          </div>
          <div className="footer-link">
            <Heart size={16} /> 100% Calidad Asegurada
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copy">
          © {currentYear} Cóndor Mates. Todos los derechos reservados.
        </p>
        <p className="dev-by">
          Desarrollado con 🔥 por{' '}
          <a 
            href={`https://wa.me/543572595756?text=${encodeURIComponent("Hola Francisco, me gustó mucho la web de Cóndor Mates!")}`} 
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
