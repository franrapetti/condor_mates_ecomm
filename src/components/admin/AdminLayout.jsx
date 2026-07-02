import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LayoutGrid, ShoppingBag, Moon, Sun, LogOut, ExternalLink, Settings, Mail, Download, Printer, Menu, X } from 'lucide-react';
import { useAdminFavicon } from '../../hooks/useAdminFavicon';
import './AdminLayout.css';

const NAV_LINKS = [
  { to: '/admin',          end: true,  icon: <LayoutGrid size={18} />,    label: 'Catálogo'      },
  { to: '/admin/orders',   end: false, icon: <ShoppingBag size={18} />,   label: 'Ventas'        },
  { to: '/admin/leads',    end: false, icon: <Mail size={18} />,          label: 'Contactos'     },
  { to: '/admin/export',   end: false, icon: <Download size={18} />,      label: 'Exportar CSV'  },
  { to: '/admin/screenshots', end: false, icon: <Printer size={18} />,    label: 'Capturas ML'   },
  { to: '/admin/settings', end: false, icon: <Settings size={18} />,      label: 'Configuración' },
];

// Bottom nav shows the most important links for mobile
const BOTTOM_NAV_LINKS = [
  { to: '/admin',          end: true,  icon: <LayoutGrid size={20} />,    label: 'Catálogo'  },
  { to: '/admin/orders',   end: false, icon: <ShoppingBag size={20} />,   label: 'Ventas'    },
  { to: '/admin/leads',    end: false, icon: <Mail size={20} />,          label: 'Contactos' },
  { to: '/admin/settings', end: false, icon: <Settings size={20} />,      label: 'Ajustes'   },
];

const AdminLayout = () => {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  useAdminFavicon();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = user?.email?.[0]?.toUpperCase() ?? 'A';

  // Auto-close sidebar when navigating
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    try { await logout(); navigate('/admin/login'); }
    catch (err) { console.error(err); }
  };

  return (
    <div className="adm-shell">

      {/* ── Backdrop (mobile only) ── */}
      {sidebarOpen && (
        <div
          className="adm-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`adm-sidebar${sidebarOpen ? ' adm-sidebar--open' : ''}`}>
        <div className="adm-brand">
          <span className="adm-brand-logo">Cóndor Mates</span>
          <span className="adm-brand-pill">Admin</span>
          <button
            className="adm-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
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
          <button
            className="adm-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <span className="adm-topbar-brand-mobile">Cóndor Mates</span>
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

        {/* ── Bottom Navigation (mobile only) ── */}
        <nav className="adm-bottom-nav">
          {BOTTOM_NAV_LINKS.map(({ to, end, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `adm-bottom-nav-link${isActive ? ' adm-bottom-nav-link--active' : ''}`}
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

    </div>
  );
};

export default AdminLayout;
