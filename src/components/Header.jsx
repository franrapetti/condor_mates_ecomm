import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Heart, ShoppingBag, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLaunchTimer } from '../hooks/useLaunchTimer';
import './Header.css';

const categoryTree = [
  { name: 'Todos los Productos', value: 'All' },
  { name: 'Mates', value: 'Mates', subs: ['Torpedo', 'Imperial', 'Varios'] },
  { name: 'Yerbas', value: 'Yerbas' },
  { name: 'Bombillas', value: 'Bombillas', subs: ['Bombillas Acero', 'Bombillas Alpaca', 'Bombillones de Alpaca', 'Bombillones de Acero'] },
  { name: 'Materas y Yerberas', value: 'Materas y Yerberas' },
  { name: 'Accesorios', value: 'Accesorios' },
  { name: 'Termos', value: 'Termos', subs: ['Termolar', 'Media Manija Cebador', 'Stanley Mate Sistem', 'Houdson'] }
];

const Header = ({ cartCount, onCartClick, onNavClick, currentCategory }) => {
  const { isDark, toggleTheme } = useTheme();
  const { isLaunched } = useLaunchTimer();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isProductActive = ['All', 'Mates', 'Yerbas', 'Bombillas', 'Materas y Yerberas', 'Accesorios', 'Termos'].includes(currentCategory);

  const handleNavClick = (cat, subCat) => {
    onNavClick(cat, subCat);
    setIsMenuOpen(false);
  };

  return (
    <header className="header sticky">
      <div className="container header-content">
        <div className="header-logo" onClick={() => onNavClick('All')}>
          <img src={isDark ? "/logo-noche.png" : "/logo.png"} alt="Cóndor Mates" className="logo-img" />
        </div>

        <nav className={`desktop-nav ${isMenuOpen ? 'mobile-open' : ''}`}>
          <ul className="nav-links">
            <li className="dropdown-parent">
              <button 
                className={isProductActive ? 'active' : ''} 
                onClick={() => handleNavClick('All', 'All')}
              >
                Productos ▾
              </button>
              <div className="dropdown-menu">
                {categoryTree.map(cat => (
                  <div key={cat.value} className="dropdown-group">
                    <button 
                      onClick={() => handleNavClick(cat.value, 'All')} 
                      className="dropdown-main-btn"
                    >
                      {cat.name}
                    </button>
                    {cat.subs && (
                      <div className="dropdown-subs">
                        {cat.subs.map(sub => (
                           <button 
                             key={sub} 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleNavClick(cat.value, sub);
                             }} 
                             className="dropdown-sub-btn"
                           >
                             {sub}
                           </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </li>
            <li><button className={currentCategory === 'Nosotros' ? 'active' : ''} onClick={() => handleNavClick('Nosotros', 'All')}>Quiénes somos</button></li>
            <li><button className={currentCategory === 'Envios' ? 'active' : ''} onClick={() => handleNavClick('Envios', 'All')}>Envíos</button></li>
            <li><Link to="/empresas" onClick={() => setIsMenuOpen(false)} className={`header-nav-link ${currentCategory === 'Empresas' ? 'active' : ''}`}>Empresas 🏢</Link></li>
          </ul>
        </nav>
        <div className="header-actions">
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <button className="theme-toggle" onClick={toggleTheme} title="Cambiar Tema" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
          </button>
          <Link to="/favoritos" className="wishlist-header-btn" title="Mis Favoritos" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Heart size={20} strokeWidth={1.5} />
          </Link>
          {isLaunched && (
            <button className="cart-btn" onClick={onCartClick} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
