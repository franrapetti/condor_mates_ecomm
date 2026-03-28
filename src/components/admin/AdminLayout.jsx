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
          <h2>Mate Shop Admin</h2>
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
          <button className="theme-toggle" onClick={toggleTheme} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: '0.75rem', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: '600' }}>
            {isDark ? <><Sun size={18} style={{marginRight: '8px'}}/> Claro</> : <><Moon size={18} style={{marginRight: '8px'}}/> Oscuro</>}
          </button>
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
