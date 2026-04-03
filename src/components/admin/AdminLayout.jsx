import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LayoutGrid, ShoppingBag, Moon, Sun, LogOut, ExternalLink } from 'lucide-react';
import './AdminLayout.css';

const NAV_LINKS = [
  { to: '/admin',        end: true,  icon: <LayoutGrid size={18} />,  label: 'Catálogo'  },
  { to: '/admin/orders', end: false, icon: <ShoppingBag size={18} />, label: 'Ventas'    },
];

const AdminLayout = () => {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const initials = user?.email?.[0]?.toUpperCase() ?? 'A';

  const handleLogout = async () => {
    try { await logout(); navigate('/admin/login'); }
    catch (err) { console.error(err); }
  };

  return (
    <div className="adm-shell">

      {/* ── Sidebar ── */}
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <span className="adm-brand-logo">Cóndor Mates</span>
          <span className="adm-brand-pill">Admin</span>
        </div>

        <nav className="adm-nav">
          {NAV_LINKS.map(({ to, end, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `adm-nav-link${isActive ? ' adm-nav-link--active' : ''}`}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <a href="/" target="_blank" rel="noreferrer" className="adm-nav-link adm-nav-link--muted">
            <ExternalLink size={17} />
            Ver tienda
          </a>
          <button onClick={handleLogout} className="adm-nav-link adm-nav-link--danger">
            <LogOut size={17} />
            Salir
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="adm-main">
        <header className="adm-topbar">
          <div style={{ flex: 1 }} />
          <div className="adm-topbar-right">
            <button className="adm-theme-btn" onClick={toggleTheme} title="Cambiar tema">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="adm-avatar">{initials}</div>
            <span className="adm-user-email">{user?.email}</span>
          </div>
        </header>

        <div className="adm-content">
          <Outlet />
        </div>
      </div>

    </div>
  );
};

export default AdminLayout;
