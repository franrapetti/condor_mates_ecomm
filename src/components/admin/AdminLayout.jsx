import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import './AdminLayout.css';

const AdminLayout = () => {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2>Mate Shop Admin</h2>
            <button className="theme-toggle" onClick={toggleTheme} title="Cambiar Tema" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.3rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dark)', cursor: 'pointer' }}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <p className="admin-user">{user?.email}</p>
        </div>
        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => isActive ? 'active' : ''}>
            📦 Catálogo
          </NavLink>
          <NavLink to="/admin/orders" className={({ isActive }) => isActive ? 'active' : ''}>
            💰 Ventas
          </NavLink>
        </nav>
        <div className="admin-footer">
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </aside>
      <main className="admin-content">
        <div className="admin-content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
