import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import './OrdersList.css';

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Mercado Pago', 'Débito', 'Otro'];
const STATUS_OPTIONS = [
  { value: 'paid', label: 'Pagado ✅' },
  { value: 'debt', label: 'Me deben 💰' },
];
const EMPTY_FORM = {
  customer_name: '', customer_phone: '', items: '',
  total_amount: '', payment_method: 'Efectivo', status: 'paid', notes: ''
};

const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [manualSales, setManualSales] = useState([]);
  const [pageViews, setPageViews] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Manual form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState(EMPTY_FORM);
  const [savingManual, setSavingManual] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [filter, setFilter] = useState('all');
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('30d'); // '7d' | '30d' | '90d' | 'all'

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

      const { data: manualData, error: manualError } = await supabase
        .from('manual_sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!manualError) setManualSales(manualData || []);

      const { data: viewsData } = await supabase
        .from('page_views')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);
      setPageViews(viewsData || []);

      // Fetch funnel analytics events
      try {
        const { data: eventsData } = await supabase
          .from('analytics_events')
          .select('event_name, session_id, created_at')
          .order('created_at', { ascending: false })
          .limit(5000);
        if (eventsData) setAllEvents(eventsData);
      } catch (_) {
        // silently ignore
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }

    // --- Fetch Alerts ---
    const newAlerts = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: pendingShip } = await supabase
      .from('orders')
      .select('id, customer_name, created_at')
      .eq('status', 'paid')
      .lt('created_at', oneDayAgo);

    if (pendingShip && pendingShip.length > 0) {
      newAlerts.push({
        id: 'unshipped', type: 'warning', icon: '📦',
        message: `Tenés ${pendingShip.length} orden${pendingShip.length > 1 ? 'es' : ''} web pagada${pendingShip.length > 1 ? 's' : ''} sin enviar hace más de 24 horas.`,
        action: () => setFilter('paid')
      });
    }

    // const { data: lowStock } = await supabase.from('products').select('id, name, stock').lte('stock', 3).gt('stock', 0);
    // if (lowStock && lowStock.length > 0) {
    //   newAlerts.push({
    //     id: 'lowstock', type: 'caution', icon: '⚠️',
    //     message: `Stock bajo: ${lowStock.map(p => `${p.name} (${p.stock} ud.)`).join(', ')}.`
    //   });
    // }

    const { data: noStock } = await supabase.from('products').select('id, name').eq('stock', 0);
    // if (noStock && noStock.length > 0) {
    //   newAlerts.push({
    //     id: 'nostock', type: 'danger', icon: '🚨',
    //     message: `Sin stock: ${noStock.map(p => p.name).join(', ')}. Estos productos siguen visibles en la tienda.`
    //   });
    // }

    setAlerts(newAlerts);
  };

  // --- Web Orders Mutations ---
  const updateOrderStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === id) setSelectedOrder({ ...selectedOrder, status: newStatus });
    } catch (error) {
      alert('Error actualizando el estado de la orden');
    }
  };

  // --- Manual Sales Mutations ---
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.customer_name.trim() || !manualForm.items.trim() || !manualForm.total_amount) return;
    setSavingManual(true);
    const { error } = await supabase.from('manual_sales').insert([{
      ...manualForm,
      total_amount: Number(manualForm.total_amount),
    }]);
    if (!error) {
      setManualForm(EMPTY_FORM);
      setShowManualForm(false);
      fetchData();
    } else {
      alert('Error al guardar: ' + error.message);
    }
    setSavingManual(false);
  };

  const handleDeleteManual = async (id) => {
    const { error } = await supabase.from('manual_sales').delete().eq('id', id);
    if (!error) {
      setManualSales(prev => prev.filter(s => s.id !== id));
      setDeleteConfirm(null);
    }
  };

  const handleMarkManualPaid = async (id) => {
    const { error } = await supabase.from('manual_sales').update({ status: 'paid' }).eq('id', id);
    if (!error) setManualSales(prev => prev.map(s => s.id === id ? { ...s, status: 'paid' } : s));
  };

  const getStatusBadge = (status, isManual = false) => {
    if (isManual && status === 'debt') return <span className="status-badge pending" style={{background:'#fef3c7', color:'#d97706'}}>Me Debe</span>;
    switch(status) {
      case 'paid': return <span className="status-badge paid">Pagado</span>;
      case 'pending': return <span className="status-badge pending">Pendiente</span>;
      case 'shipped': return <span className="status-badge shipped">Enviado</span>;
      case 'canceled': return <span className="status-badge canceled">Cancelado</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  const unifiedSales = useMemo(() => {
    const web = orders.map(o => ({
      id: o.id,
      type: 'web',
      created_at: o.created_at,
      customer_name: o.customer_name,
      customer_info: o.customer_email || o.customer_city,
      items_desc: o.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Sin items',
      total: o.total_price || 0,
      status: o.status,
      payment_method: o.payment_method || (o.mp_payment_id ? 'Mercado Pago' : 'Transferencia'),
      source: o.source,
      original: o
    }));

    const manual = manualSales.map(m => ({
      id: m.id,
      type: 'manual',
      created_at: m.created_at,
      customer_name: m.customer_name,
      customer_info: m.customer_phone ? `📞 ${m.customer_phone}` : '',
      items_desc: m.items,
      total: m.total_amount || 0,
      status: m.status,
      payment_method: m.payment_method,
      source: 'manual',
      original: m
    }));

    return [...web, ...manual].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [orders, manualSales]);

  const filteredSales = unifiedSales.filter(s => {
    const matchesFilter = filter === 'all' || s.status === filter || (filter === 'web' && s.type === 'web') || (filter === 'manual' && s.type === 'manual');
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      s.customer_name?.toLowerCase().includes(searchLower) ||
      s.customer_info?.toLowerCase().includes(searchLower) ||
      s.items_desc?.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  // Calculate Basic KPIs (Unified)
  const validWeb = orders.filter(o => o.status === 'paid' || o.status === 'shipped');
  const validManual = manualSales.filter(s => s.status === 'paid');
  
  const totalRevenue = validWeb.reduce((acc, o) => acc + o.total_price, 0) + validManual.reduce((acc, m) => acc + m.total_amount, 0);
  const totalSalesCount = validWeb.length + validManual.length;
  const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  
  const debtSales = manualSales.filter(s => s.status === 'debt');
  const totalDebt = debtSales.reduce((acc, s) => acc + s.total_amount, 0);

  // Calculate Advanced KPIs
  const getCutoff = () => {
    if (dateRange === 'all') return null;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  };

  const filteredViews = useMemo(() => {
    const cutoff = getCutoff();
    return pageViews.filter(v => !cutoff || new Date(v.created_at) >= cutoff);
  }, [pageViews, dateRange]);

  const uniqueSessions = new Set(filteredViews.map(v => v.session_id)).size;
  const conversionRate = uniqueSessions > 0 ? ((totalSalesCount / uniqueSessions) * 100).toFixed(2) : 0;
  
  const totalDuration = filteredViews.reduce((acc, v) => acc + (v.duration_seconds || 0), 0);
  const avgDurationSeconds = uniqueSessions > 0 ? Math.floor(totalDuration / uniqueSessions) : 0;
  const avgDurationFormatted = `${Math.floor(avgDurationSeconds / 60)}m ${avgDurationSeconds % 60}s`;

  const funnelData = useMemo(() => {
    const cutoff = getCutoff();
    const filteredEvents = allEvents.filter(e => !cutoff || new Date(e.created_at) >= cutoff);
    const funnelSteps = [
      { key: 'view_catalog', label: '1. Visitaron el Sitio', emoji: '🌐' },
      { key: 'view_product', label: '2. Vieron un Producto', emoji: '👁️' },
      { key: 'add_to_cart', label: '3. Añadieron al Carrito', emoji: '🛒' },
      { key: 'initiate_checkout', label: '4. Iniciaron Checkout', emoji: '💳' },
      { key: 'purchase', label: '5. Compra Exitosa', emoji: '✅' },
    ];
    return funnelSteps.map(step => {
      const unique = new Set(filteredEvents.filter(e => e.event_name === step.key).map(e => e.session_id)).size;
      return { ...step, sessions: unique };
    });
  }, [allEvents, dateRange]);

  // Chart Data Preparation (Unified)
  const chartData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const monthlyData = months.map(m => ({ name: m, ingresos: 0 }));
    const dailyData = days.map(d => ({ name: d, ordenes: 0 }));
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, volumen: 0 }));

    const sourceDataMap = {};
    filteredViews.forEach(v => {
      const raw = v.source && v.source !== 'null' ? v.source.toLowerCase() : 'direct';
      const labelMap = {
        instagram: '📸 Instagram', facebook: '👥 Facebook', whatsapp: '💬 WhatsApp',
        tiktok: '🎵 TikTok', google: '🔍 Google', direct: '🌐 Directo',
      };
      const origin = labelMap[raw] || `🔗 ${raw.charAt(0).toUpperCase() + raw.slice(1)}`;
      sourceDataMap[origin] = (sourceDataMap[origin] || 0) + 1;
    });
    const sourceData = Object.entries(sourceDataMap).map(([name, visitas]) => ({ name, visitas })).sort((a, b) => b.visitas - a.visitas);

    const monthlyViewsMap = {};
    pageViews.forEach(v => {
      const d = new Date(v.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthlyViewsMap[key]) monthlyViewsMap[key] = { name: label, visitas: 0, sesiones: 0, _sessions: new Set() };
      monthlyViewsMap[key].visitas += 1;
      monthlyViewsMap[key]._sessions.add(v.session_id);
    });
    const monthlyViews = Object.entries(monthlyViewsMap).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => ({ name: v.name, visitas: v.visitas, sesiones: v._sessions.size }));

    unifiedSales.forEach(sale => {
      const isValid = (sale.type === 'web' && (sale.status === 'paid' || sale.status === 'shipped')) ||
                      (sale.type === 'manual' && sale.status === 'paid');
      if (isValid) {
        const date = new Date(sale.created_at);
        monthlyData[date.getMonth()].ingresos += sale.total;
        dailyData[date.getDay()].ordenes += 1;
        hourlyData[date.getHours()].volumen += 1;
      }
    });

    return { monthlyData, dailyData, hourlyData, sourceData, monthlyViews };
  }, [unifiedSales, filteredViews, pageViews]);

  return (
    <div className="orders-dashboard">
      <div className="dashboard-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
        <h1>Centro de Comando Analítico 👁️‍🗨️</h1>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <button className="btn-secondary" onClick={fetchData} style={{padding: '0.5rem 1rem'}}>
            ↻ Sincronizar
          </button>
          <button className="btn-primary" onClick={() => setShowManualForm(!showManualForm)} style={{padding: '0.5rem 1rem', background: 'var(--text-dark)'}}>
            {showManualForm ? '✕ Cancelar' : '+ Venta Manual'}
          </button>
        </div>
      </div>

      {showManualForm && (
        <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 12, marginBottom: '2rem', border: '1px solid var(--border)'}}>
          <h3 style={{marginTop: 0}}>📝 Registrar Venta Manual</h3>
          <form onSubmit={handleManualSubmit} style={{display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}>
            <input type="text" placeholder="Nombre del Cliente *" required value={manualForm.customer_name} onChange={e => setManualForm({...manualForm, customer_name: e.target.value})} className="orders-search-input" />
            <input type="text" placeholder="Teléfono / WhatsApp" value={manualForm.customer_phone} onChange={e => setManualForm({...manualForm, customer_phone: e.target.value})} className="orders-search-input" />
            <input type="text" placeholder="Productos (Ej: 1x Mate) *" required value={manualForm.items} onChange={e => setManualForm({...manualForm, items: e.target.value})} className="orders-search-input" style={{gridColumn: '1 / -1'}} />
            <input type="number" placeholder="Monto Total *" required min="0" value={manualForm.total_amount} onChange={e => setManualForm({...manualForm, total_amount: e.target.value})} className="orders-search-input" />
            <select value={manualForm.payment_method} onChange={e => setManualForm({...manualForm, payment_method: e.target.value})} className="orders-search-input">
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={manualForm.status} onChange={e => setManualForm({...manualForm, status: e.target.value})} className="orders-search-input">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input type="text" placeholder="Notas opcionales" value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} className="orders-search-input" style={{gridColumn: '1 / -1'}} />
            <button type="submit" className="btn-primary" disabled={savingManual} style={{gridColumn: '1 / -1', maxWidth: 200}}>
              {savingManual ? 'Guardando...' : '✓ Guardar Venta'}
            </button>
          </form>
        </div>
      )}

      {/* Proactive Alert Banners */}
      {alerts.filter(a => !dismissedAlerts.includes(a.id)).map(alert => (
        <div key={alert.id} className={`admin-alert admin-alert--${alert.type}`}>
          <span className="admin-alert-icon">{alert.icon}</span>
          <p className="admin-alert-msg">{alert.message}</p>
          <div className="admin-alert-actions">
            {alert.action && (
              <button className="admin-alert-act-btn" onClick={alert.action}>Filtrar órdenes</button>
            )}
            <button className="admin-alert-dismiss" onClick={() => setDismissedAlerts(prev => [...prev, alert.id])}>×</button>
          </div>
        </div>
      ))}

      {debtSales.length > 0 && (
        <div className="admin-alert admin-alert--warning" style={{borderColor: '#fbbf24', background: '#fffbeb'}}>
          <span className="admin-alert-icon">💰</span>
          <p className="admin-alert-msg" style={{color: '#b45309'}}>
            <strong>Atención:</strong> Tienes <strong>{debtSales.length}</strong> ventas manuales pendientes de cobro por un total de <strong>${totalDebt.toLocaleString()}</strong>.
          </p>
          <div className="admin-alert-actions">
            <button className="admin-alert-act-btn" onClick={() => setFilter('debt')} style={{background: '#b45309', color: 'white'}}>Ver deudores</button>
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>Ingresos Brutos</h3>
          <p className="kpi-value">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="kpi-card">
          <h3>Ventas Concretadas</h3>
          <p className="kpi-value">{totalSalesCount}</p>
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', margin: '1.5rem 0 1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-dark)' }}>📊 Analíticas de Tráfico</h2>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[['7d', '7 días'], ['30d', '30 días'], ['90d', '90 días'], ['all', 'Todo']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDateRange(val)}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: 20, border: '1px solid var(--border)',
                background: dateRange === val ? 'var(--accent)' : 'transparent',
                color: dateRange === val ? 'white' : 'var(--text-dark)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

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
          <h3>🔔 Mapa de Calor Horario (Volumen)</h3>
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
      </div>

      <div className="orders-container">
        <div className="orders-filters" style={{marginBottom: '1rem'}}>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todas</button>
          <button className={filter === 'web' ? 'active' : ''} onClick={() => setFilter('web')}>Web</button>
          <button className={filter === 'manual' ? 'active' : ''} onClick={() => setFilter('manual')}>Manuales</button>
          <button className={filter === 'paid' ? 'active' : ''} onClick={() => setFilter('paid')}>Solo Pagadas</button>
          <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Web Pendientes</button>
          <button className={filter === 'debt' ? 'active' : ''} onClick={() => setFilter('debt')}>Deudores (Manual)</button>
          <input
            type="search"
            placeholder="🔍 Buscar por nombre, items o info..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="orders-search-input"
          />
        </div>

        {loading ? (
          <p style={{padding: '2rem'}}>Cargando información...</p>
        ) : (
          <div className="table-responsive">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Origen</th>
                  <th>Cliente</th>
                  <th>Items</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 && (
                  <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>No hay ventas registradas.</td></tr>
                )}
                {filteredSales.map(sale => (
                  <tr key={sale.id} style={{background: sale.status === 'debt' ? '#fef3c7' : 'transparent'}}>
                    <td>{new Date(sale.created_at).toLocaleDateString('es-AR', {day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'})}</td>
                    <td>
                      {sale.type === 'web' ? <span style={{background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold'}}>🌐 Web</span> 
                                           : <span style={{background: '#e5e7eb', color: '#374151', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold'}}>📝 Manual</span>}
                    </td>
                    <td>
                      <div style={{fontWeight: 600}}>{sale.customer_name}</div>
                      {sale.customer_info && <div style={{fontSize: '0.75rem', color: '#6b7280'}}>{sale.customer_info}</div>}
                    </td>
                    <td style={{maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem'}} title={sale.items_desc}>
                      {sale.items_desc}
                    </td>
                    <td>{getStatusBadge(sale.status, sale.type === 'manual')}</td>
                    <td style={{fontWeight: 600, color: sale.status === 'debt' ? '#d97706' : 'var(--accent)'}}>${sale.total.toLocaleString()}</td>
                    <td>
                      <div style={{display: 'flex', gap: '0.4rem', flexWrap: 'wrap'}}>
                        {sale.type === 'web' && (
                          <button className="btn-view" onClick={() => setSelectedOrder(sale.original)} style={{padding: '0.3rem 0.6rem'}}>VER</button>
                        )}
                        {sale.type === 'web' && sale.status === 'pending' && (
                          <button onClick={() => updateOrderStatus(sale.id, 'paid')} style={{background: '#10b981', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'}}>
                            Marcar Pagado
                          </button>
                        )}
                        {sale.type === 'web' && sale.status !== 'canceled' && (
                          <button onClick={() => updateOrderStatus(sale.id, 'canceled')} style={{background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'}}>
                            Cancelar
                          </button>
                        )}

                        {sale.type === 'manual' && sale.status === 'debt' && (
                          <button onClick={() => handleMarkManualPaid(sale.id)} style={{background: '#10b981', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'}}>
                            ✓ Pagó
                          </button>
                        )}
                        {sale.type === 'manual' && (
                          deleteConfirm === sale.id ? (
                            <div style={{display: 'flex', gap: '0.2rem'}}>
                              <button onClick={() => handleDeleteManual(sale.id)} style={{background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'}}>Sí</button>
                              <button onClick={() => setDeleteConfirm(null)} style={{background: '#9ca3af', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'}}>No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(sale.id)} style={{background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.2rem 0.4rem'}}>🗑</button>
                          )
                        )}
                      </div>
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
              <h2>Detalles de la Orden (Web)</h2>
              <button className="close-btn" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            
            <div className="order-modal-body">
              <div className="order-customer-info">
                <h3>Datos del Cliente</h3>
                <p><strong>Nombre:</strong> {selectedOrder.customer_name}</p>
                <p><strong>Email:</strong> {selectedOrder.customer_email || 'No provisto'}</p>
                <p><strong>Ciudad:</strong> {selectedOrder.customer_city}</p>
                <p><strong>Notas:</strong> {selectedOrder.customer_notes || 'Ninguna'}</p>
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
                  Total: ${selectedOrder.total_price?.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="order-modal-actions">
              <h3>Administrar Despacho</h3>
              <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                {selectedOrder.status === 'paid' && (
                  <button className="btn-primary" onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')}>
                    📦 Marcar Enviado
                  </button>
                )}
                {selectedOrder.status === 'pending' && (
                  <button className="btn-secondary" onClick={() => updateOrderStatus(selectedOrder.id, 'paid')} style={{background: '#10b981', color: 'white', borderColor: '#10b981'}}>
                    Marcar Transferencia como Pagada
                  </button>
                )}
                {selectedOrder.status !== 'canceled' && (
                  <button className="btn-danger" onClick={() => updateOrderStatus(selectedOrder.id, 'canceled')} style={{backgroundColor: '#e53935', color: 'white', border: 'none', borderRadius: '6px', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 600}}>
                    Cancelar Venta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersList;
