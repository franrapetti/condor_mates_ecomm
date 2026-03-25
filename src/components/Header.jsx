import React from 'react';
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

const Header = ({ cartCount, onCartClick, onNavClick, currentCategory, isDark, toggleTheme }) => {
  const isProductActive = ['All', 'Mates', 'Yerbas', 'Bombillas', 'Materas y Yerberas', 'Accesorios', 'Termos'].includes(currentCategory);

  return (
    <header className="header sticky">
      <div className="container header-content">
        <div className="header-logo" onClick={() => onNavClick('All')}>
          <img src="/logo.png" alt="Cóndor Mates" className="logo-img" />
        </div>

        <nav className="desktop-nav">
          <ul className="nav-links">
            <li className="dropdown-parent">
              <button 
                className={isProductActive ? 'active' : ''} 
                onClick={() => onNavClick('All', 'All')}
              >
                Productos ▾
              </button>
              <div className="dropdown-menu">
                {categoryTree.map(cat => (
                  <div key={cat.value} className="dropdown-group">
                    <button 
                      onClick={() => onNavClick(cat.value, 'All')} 
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
                               onNavClick(cat.value, sub);
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
            <li><button className={currentCategory === 'Nosotros' ? 'active' : ''} onClick={() => onNavClick('Nosotros', 'All')}>Quiénes somos</button></li>
            <li><button className={currentCategory === 'Envios' ? 'active' : ''} onClick={() => onNavClick('Envios', 'All')}>Envíos</button></li>
          </ul>
        </nav>
        <div className="header-actions">
          <button className="theme-toggle" onClick={toggleTheme} title="Cambiar Tema">
            {isDark ? '☀️' : '🌙'}
          </button>
          <button className="cart-btn" onClick={onCartClick}>
            <span>🛒</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
