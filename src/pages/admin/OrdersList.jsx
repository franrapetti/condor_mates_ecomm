import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './OrdersList.css';

const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Error cargando órdenes');
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = () => {
    const validOrders = orders.filter(o => o.status === 'paid' || o.status === 'shipped');
    const totalRevenue = validOrders.reduce((acc, o) => acc + o.total_price, 0);
    const totalSales = validOrders.length;
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    return { totalRevenue, totalSales, avgTicket };
  };

  const kpis = calculateKPIs();

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
    if (filter === 'all') return true;
    return o.status === filter;
  });

  return (
    <div className="orders-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard de Ventas</h1>
        <button className="btn-secondary" onClick={fetchOrders} style={{padding: '0.5rem 1rem'}}>
          ↻ Refrescar
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>Ingresos Brutos</h3>
          <p className="kpi-value">${kpis.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="kpi-card">
          <h3>Ventas Concretadas</h3>
          <p className="kpi-value">{kpis.totalSales}</p>
        </div>
        <div className="kpi-card">
          <h3>Ticket Promedio</h3>
          <p className="kpi-value">${Math.round(kpis.avgTicket).toLocaleString()}</p>
        </div>
      </div>

      <div className="orders-container">
        <div className="orders-filters">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todas</button>
          <button className={filter === 'paid' ? 'active' : ''} onClick={() => setFilter('paid')}>Solo Pagadas</button>
          <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Pendientes</button>
          <button className={filter === 'shipped' ? 'active' : ''} onClick={() => setFilter('shipped')}>Enviadas</button>
        </div>

        {loading ? (
          <p>Cargando información...</p>
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
                  <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>No hay órdenes en este estado.</td></tr>
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
                        Ver MÁS
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
                <p><strong>Ciudad:</strong> {selectedOrder.customer_city}</p>
                <p><strong>Notas:</strong> {selectedOrder.customer_notes || 'Ninguna'}</p>
                <p><strong>Mercado Pago ID:</strong> {selectedOrder.mp_payment_id || 'N/A'}</p>
                <p style={{marginTop: '0.5rem'}}>Estado Actual: {getStatusBadge(selectedOrder.status)}</p>
              </div>

              <div className="order-items-info">
                <h3>Productos Comprados</h3>
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
                    📦 Marcar como Enviado (Andreani)
                  </button>
                )}
                <button className="btn-secondary" onClick={() => updateOrderStatus(selectedOrder.id, 'paid')}>
                  Marcar Pagado Manualmente
                </button>
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
