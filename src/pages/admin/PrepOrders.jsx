import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Package, Truck, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import './PrepOrders.css';

export default function PrepOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShipped, setShowShipped] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prep_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching prep orders:', err);
      alert('Error al cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders]);
  const shippedOrders = useMemo(() => orders.filter(o => o.status === 'shipped'), [orders]);

  const handleMarkShipped = async (id) => {
    try {
      const { error } = await supabase
        .from('prep_orders')
        .update({ status: 'shipped' })
        .eq('id', id);

      if (error) throw error;
      setOrders(orders.map(o => o.id === id ? { ...o, status: 'shipped' } : o));
    } catch (err) {
      console.error('Error marking as shipped:', err);
      alert('Error al actualizar el estado.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar este pedido de la lista de preparación?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('prep_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setOrders(orders.filter(o => o.id !== id));
    } catch (err) {
      console.error('Error deleting order:', err);
      alert('Error al eliminar el pedido.');
    }
  };

  const parseItems = (itemsStr) => {
    try {
      if (typeof itemsStr === 'string') {
        return JSON.parse(itemsStr);
      }
      return itemsStr || [];
    } catch (e) {
      return [];
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const OrderCard = ({ order, isShipped }) => {
    const items = parseItems(order.items);

    return (
      <div className={`prep-card ${isShipped ? 'prep-card-shipped' : 'prep-card-pending'}`}>
        <div className="prep-card-header">
          <h3 className="prep-customer">{order.customer_name}</h3>
          <span className="prep-date">{formatDate(order.created_at)}</span>
        </div>
        
        <div className="prep-items">
          {items.map((item, idx) => (
            <div key={idx} className="prep-item">
              <span className="prep-item-qty">{item.quantity}x</span>
              <span className="prep-item-name">{item.name}</span>
              <span className="prep-item-price">{formatCurrency(item.price)}</span>
            </div>
          ))}
        </div>

        <div className="prep-total">
          <span>Total:</span>
          <strong>{formatCurrency(order.total_amount)}</strong>
        </div>

        {order.notes && (
          <div className="prep-notes">
            <strong>Notas: </strong>{order.notes}
          </div>
        )}

        <div className="prep-actions">
          {!isShipped && (
            <button 
              className="prep-btn prep-btn-shipped"
              onClick={() => handleMarkShipped(order.id)}
            >
              <Truck size={16} /> Marcar Enviado
            </button>
          )}
          <button 
            className="prep-btn prep-btn-delete"
            onClick={() => handleDelete(order.id)}
          >
            <Trash2 size={16} /> Eliminar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="prep-container">
      <header className="prep-header">
        <div className="prep-title-section">
          <h1><Package className="prep-title-icon" /> Pedidos a Preparar</h1>
          <div className="prep-kpi">
            <span className="prep-kpi-value">{pendingOrders.length}</span> pendientes
          </div>
        </div>
        <button className="prep-sync-btn" onClick={fetchOrders} disabled={loading}>
          <RefreshCw size={20} className={loading ? 'prep-spin' : ''} />
          <span>Sincronizar</span>
        </button>
      </header>

      {loading ? (
        <div className="prep-loading">Cargando pedidos...</div>
      ) : (
        <main className="prep-main">
          <section className="prep-section">
            <h2 className="prep-section-title">Pendientes</h2>
            {pendingOrders.length === 0 ? (
              <div className="prep-empty">🎉 No hay pedidos pendientes de preparar</div>
            ) : (
              <div className="prep-grid">
                {pendingOrders.map(order => (
                  <OrderCard key={order.id} order={order} isShipped={false} />
                ))}
              </div>
            )}
          </section>

          <section className="prep-section">
            <button 
              className="prep-shipped-toggle"
              onClick={() => setShowShipped(!showShipped)}
            >
              <div className="prep-shipped-toggle-left">
                <h2>Enviados</h2>
                <span className="prep-shipped-count">{shippedOrders.length}</span>
              </div>
              {showShipped ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {showShipped && (
              <div className="prep-shipped-content">
                {shippedOrders.length === 0 ? (
                  <div className="prep-empty">No hay envíos registrados aún</div>
                ) : (
                  <div className="prep-grid">
                    {shippedOrders.map(order => (
                      <OrderCard key={order.id} order={order} isShipped={true} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
