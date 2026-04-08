import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import './OrdersList.css';

const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [pageViews, setPageViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('30d'); // '7d' | '30d' | '90d' | 'all'
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      const { data: viewsData } = await supabase
        .from('page_views')
        .select('*');
      setPageViews(viewsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }

    // --- Fetch Alerts ---
    const newAlerts = [];

    // Alert 1: Paid orders not shipped after 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: pendingShip } = await supabase
      .from('orders')
      .select('id, customer_name, created_at')
      .eq('status', 'paid')
      .lt('created_at', oneDayAgo);

    if (pendingShip && pendingShip.length > 0) {
      newAlerts.push({
        id: 'unshipped',
        type: 'warning',
        icon: '📦',
        message: `Tenés ${pendingShip.length} orden${pendingShip.length > 1 ? 'es' : ''} pagada${pendingShip.length > 1 ? 's' : ''} sin enviar hace más de 24 horas.`,
        action: () => setFilter('paid')
      });
    }

    // Alert 2: Products with low stock
    const { data: lowStock } = await supabase
      .from('products')
      .select('id, name, stock')
      .lte('stock', 3)
      .gt('stock', 0);

    if (lowStock && lowStock.length > 0) {
      newAlerts.push({
        id: 'lowstock',
        type: 'caution',
        icon: '⚠️',
        message: `Stock bajo: ${lowStock.map(p => `${p.name} (${p.stock} ud.)`).join(', ')}.`
      });
    }

    // Alert 3: Products completely out of stock
    const { data: noStock } = await supabase
      .from('products')
      .select('id, name')
      .eq('stock', 0);

    if (noStock && noStock.length > 0) {
      newAlerts.push({
        id: 'nostock',
        type: 'danger',
        icon: '🚨',
        message: `Sin stock: ${noStock.map(p => p.name).join(', ')}. Estos productos siguen visibles en la tienda.`
      });
    }

    setAlerts(newAlerts);
  };

  const updateOrderStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      alert('Error actualizando el estado de la orden');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'paid': return <span className="status-badge paid">Pagado</span>;
      case 'pending': return <span className="status-badge pending">Pendiente</span>;
      case 'shipped': return <span className="status-badge shipped">Enviado</span>;
      case 'canceled': return <span className="status-badge canceled">Cancelado</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      o.customer_name?.toLowerCase().includes(searchLower) ||
      o.customer_city?.toLowerCase().includes(searchLower) ||
      o.customer_email?.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  // Calculate Basic KPIs
  const validOrders = orders.filter(o => o.status === 'paid' || o.status === 'shipped');
  const totalRevenue = validOrders.reduce((acc, o) => acc + o.total_price, 0);
  const totalSales = validOrders.length;
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Calculate Advanced KPIs
  const uniqueSessions = new Set(pageViews.map(v => v.session_id)).size;
  const conversionRate = uniqueSessions > 0 ? ((totalSales / uniqueSessions) * 100).toFixed(2) : 0;
  
  const totalDuration = pageViews.reduce((acc, v) => acc + (v.duration_seconds || 0), 0);
  const avgDurationSeconds = uniqueSessions > 0 ? Math.floor(totalDuration / uniqueSessions) : 0;
  const avgDurationFormatted = `${Math.floor(avgDurationSeconds / 60)}m ${avgDurationSeconds % 60}s`;

  // ── Date range helper ──────────────────────────────────────────────────────
  const getCutoff = () => {
    if (dateRange === 'all') return null;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  };

  const filteredViews = useMemo(() => {
    const cutoff = getCutoff();
    return pageViews.filter(v => !cutoff || new Date(v.created_at) >= cutoff);
  }, [pageViews, dateRange]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const monthlyData = months.map(m => ({ name: m, ingresos: 0 }));
    const dailyData = days.map(d => ({ name: d, ordenes: 0 }));
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, volumen: 0 }));

    // Source map — use filteredViews so date range applies
    const sourceDataMap = {};
    filteredViews.forEach(v => {
      const raw = v.source && v.source !== 'null' ? v.source.toLowerCase() : 'direct';
      // Friendly labels
      const labelMap = {
        instagram: '📸 Instagram',
        facebook:  '👥 Facebook',
        whatsapp:  '💬 WhatsApp',
        tiktok:    '🎵 TikTok',
        google:    '🔍 Google',
        direct:    '🌐 Directo',
      };
      const origin = labelMap[raw] || `🔗 ${raw.charAt(0).toUpperCase() + raw.slice(1)}`;
      sourceDataMap[origin] = (sourceDataMap[origin] || 0) + 1;
    });
    const sourceData = Object.entries(sourceDataMap)
      .map(([name, visitas]) => ({ name, visitas }))
      .sort((a, b) => b.visitas - a.visitas);

    // Monthly page views (all time, no date filter — historical)
    const monthlyViewsMap = {};
    pageViews.forEach(v => {
      const d = new Date(v.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthlyViewsMap[key]) monthlyViewsMap[key] = { name: label, visitas: 0, sesiones: 0, _sessions: new Set() };
      monthlyViewsMap[key].visitas += 1;
      monthlyViewsMap[key]._sessions.add(v.session_id);
    });
    const monthlyViews = Object.entries(monthlyViewsMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ name: v.name, visitas: v.visitas, sesiones: v._sessions.size }));

    validOrders.forEach(order => {
      const date = new Date(order.created_at);
      monthlyData[date.getMonth()].ingresos += order.total_price;
      dailyData[date.getDay()].ordenes += 1;
      hourlyData[date.getHours()].volumen += 1;
    });

    return { monthlyData, dailyData, hourlyData, sourceData, monthlyViews };
  }, [validOrders, filteredViews, pageViews]);

  return (
    <div className="orders-dashboard">
      <div className="dashboard-header">
        <h1>Centro de Comando Analítico 👁️‍🗨️</h1>
        <button className="btn-secondary" onClick={fetchData} style={{padding: '0.5rem 1rem'}}>
          ↻ Sincronizar Datos
        </button>
      </div>

      {/* Proactive Alert Banners */}
      {alerts.filter(a => !dismissedAlerts.includes(a.id)).map(alert => (
        <div key={alert.id} className={`admin-alert admin-alert--${alert.type}`}>
          <span className="admin-alert-icon">{alert.icon}</span>
          <p className="admin-alert-msg">{alert.message}</p>
          <div className="admin-alert-actions">
            {alert.action && (
              <button className="admin-alert-act-btn" onClick={alert.action}>Ver órdenes</button>
            )}
            <button className="admin-alert-dismiss" onClick={() => setDismissedAlerts(prev => [...prev, alert.id])}>×</button>
          </div>
        </div>
      ))}

      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>Ingresos Brutos</h3>
          <p className="kpi-value">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="kpi-card">
          <h3>Ventas Concretadas</h3>
          <p className="kpi-value">{totalSales}</p>
        </div>
        <div className="kpi-card">
          <h3>Ticket Promedio</h3>
          <p className="kpi-value">${Math.round(avgTicket).toLocaleString()}</p>
        </div>
        <div className="kpi-card analytics-kpi">
          <h3>Visitas Únicas</h3>
          <p className="kpi-value">{uniqueSessions}</p>
        </div>
        <div className="kpi-card analytics-kpi">
          <h3>Tasa de Conversión</h3>
          <p className="kpi-value">{conversionRate}%</p>
        </div>
        <div className="kpi-card analytics-kpi">
          <h3>Tiempo Vista Promedio</h3>
          <p className="kpi-value">{avgDurationFormatted}</p>
        </div>
      </div>

      {/* Analytics Section Header + Date Range Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', margin: '1.5rem 0 1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-dark)' }}>📊 Analíticas de Tráfico</h2>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[['7d', '7 días'], ['30d', '30 días'], ['90d', '90 días'], ['all', 'Todo']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDateRange(val)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: dateRange === val ? 'var(--accent)' : 'transparent',
                color: dateRange === val ? 'white' : 'var(--text-dark)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* No analytics data empty state */}
      {pageViews.length === 0 && (
        <div style={{
          background: '#fef9c3', border: '1px solid #fde68a',
          borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem',
          fontSize: '0.85rem', color: '#92400e',
        }}>
          <strong>⚠️ Sin datos de tráfico aún.</strong> Las visitas se empezarán a registrar automáticamente
          cuando los usuarios naveguen el sitio. Asegurate de haber ejecutado <code>setup_analytics_v3.sql</code> en Supabase.
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-card chart-full-width">
          <h3>📈 Crecimiento Mensual (Ingresos Brutos)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Ingresos']} />
                <Line type="monotone" dataKey="ingresos" stroke="#234a2e" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>📊 Órdenes por Día (Semanal)</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={chartData.dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" allowDecimals={false} />
                <Tooltip formatter={(value) => [value, 'Órdenes']} cursor={{fill: 'transparent'}} />
                <Bar dataKey="ordenes" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>🔔 Mapa de Calor Horario (Volumen de Compras)</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" interval={3} />
                <YAxis stroke="#6B7280" allowDecimals={false} />
                <Tooltip formatter={(value) => [value, 'Ventas a esta hora']} />
                <Area type="monotone" dataKey="volumen" stroke="#e65100" fill="#ffb74d" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source Origin Chart */}
        <div className="chart-card">
          <h3>🌐 Origen del Tráfico
            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-light)', marginLeft: '0.5rem' }}>
              ({dateRange === 'all' ? 'Historial completo' : `Últimos ${dateRange}`})
            </span>
          </h3>
          {chartData.sourceData.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
              Sin datos en el período seleccionado.<br/>
              <small>Probá con "Todo" o esperá a que entren visitas con UTM/ref en la URL.</small>
            </div>
          ) : (
            <div style={{ width: '100%', height: Math.max(180, chartData.sourceData.length * 44) }}>
              <ResponsiveContainer>
                <BarChart data={chartData.sourceData} layout="vertical" margin={{ top: 4, right: 30, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#6B7280" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#6B7280" width={130} tick={{ fontSize: 11, fill: '#374151', fontWeight: 700 }} />
                  <Tooltip formatter={(value) => [value, 'Sesiones de visita']} cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
                  <Bar dataKey="visitas" fill="#10b981" radius={[0, 6, 6, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Traffic Breakdown Table */}
      {chartData.monthlyViews && chartData.monthlyViews.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1.25rem', marginBottom: '2rem',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)' }}>
            📅 Visitas Mensuales al Sitio
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Mes', 'Vistas Totales', 'Sesiones Únicas'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 800, color: 'var(--text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...chartData.monthlyViews].reverse().map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--background)' }}>
                    <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700, color: 'var(--text-dark)' }}>{row.name}</td>
                    <td style={{ padding: '0.55rem 0.75rem', color: 'var(--text-dark)' }}>{row.visitas.toLocaleString()}</td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#10b981', fontWeight: 700 }}>{row.sesiones.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="orders-container">
        <div className="orders-filters">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todas</button>
          <button className={filter === 'paid' ? 'active' : ''} onClick={() => setFilter('paid')}>Solo Pagadas</button>
          <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Pendientes</button>
          <button className={filter === 'shipped' ? 'active' : ''} onClick={() => setFilter('shipped')}>Enviadas</button>
          <input
            type="search"
            placeholder="🔍 Buscar por nombre, ciudad o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="orders-search-input"
          />
        </div>

        {loading ? (
          <p style={{padding: '2rem'}}>Cargando información logísitca...</p>
        ) : (
          <div className="table-responsive">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 && (
                  <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>No hay órdenes registradas.</td></tr>
                )}
                {filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td>{new Date(order.created_at).toLocaleDateString('es-AR', {day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'})}</td>
                    <td style={{fontWeight: 600}}>{order.customer_name}</td>
                    <td>{order.customer_city}</td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td style={{fontWeight: 600, color: 'var(--accent)'}}>${order.total_price?.toLocaleString()}</td>
                    <td>
                      <button className="btn-view" onClick={() => setSelectedOrder(order)}>
                        VER GUÍA
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="order-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="order-modal-content" onClick={e => e.stopPropagation()}>
            <div className="order-modal-header">
              <h2>Detalles de la Orden</h2>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            
            <div className="order-modal-body">
              <div className="order-customer-info">
                <h3>Datos del Cliente</h3>
                <p><strong>Nombre:</strong> {selectedOrder.customer_name}</p>
                <p><strong>Email:</strong> {selectedOrder.customer_email || 'No provisto'}</p>
                <p><strong>Ciudad:</strong> {selectedOrder.customer_city}</p>
                <p><strong>Notas:</strong> {selectedOrder.customer_notes || 'Ninguna'}</p>
                <p><strong>Origen (Ads):</strong> <span style={{backgroundColor: '#e6fced', color: '#008a3d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase'}}>{selectedOrder.source || 'Directo'}</span></p>
                <p><strong>Mercado Pago ID:</strong> {selectedOrder.mp_payment_id || 'N/A'}</p>
                <p style={{marginTop: '0.5rem'}}>Estado Actual: {getStatusBadge(selectedOrder.status)}</p>
              </div>

              <div className="order-items-info">
                <h3>Productos a Empacar</h3>
                <ul className="order-items-list">
                  {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                    <li key={idx}>
                      <span className="qty">{item.quantity}x</span> {item.name} 
                      <span className="price">${(item.price * item.quantity).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
                <div className="order-modal-total">
                  Total Cobrado: ${selectedOrder.total_price?.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="order-modal-actions">
              <h3>Administrar Despacho</h3>
              <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                {selectedOrder.status === 'paid' && (
                  <button className="btn-primary" onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')}>
                    📦 Imprimir Etiqueta y Marcar Enviado
                  </button>
                )}
                {selectedOrder.status === 'pending' && (
                  <button className="btn-secondary" onClick={() => updateOrderStatus(selectedOrder.id, 'paid')}>
                    Marcar Pagado Manualmente (WhatsApp)
                  </button>
                )}
                <button className="btn-danger" onClick={() => updateOrderStatus(selectedOrder.id, 'canceled')} style={{backgroundColor: '#e53935', color: 'white', border: 'none', borderRadius: '6px', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 600}}>
                  Cancelar Orden (Reembolso)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersList;
