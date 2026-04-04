import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ManualSales.css';

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Mercado Pago', 'Débito', 'Otro'];
const STATUS_OPTIONS = [
  { value: 'paid', label: 'Pagado ✅' },
  { value: 'debt', label: 'Me deben 💰' },
];

const EMPTY_FORM = {
  customer_name: '',
  customer_phone: '',
  items: '',
  total_amount: '',
  payment_method: 'Efectivo',
  status: 'paid',
  notes: '',
};

const ManualSales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchSales(); }, []);

  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('manual_sales')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setSales(data || []);
    setLoading(false);
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.items.trim() || !form.total_amount) return;
    setSaving(true);
    const { error } = await supabase.from('manual_sales').insert([{
      ...form,
      total_amount: Number(form.total_amount),
    }]);
    if (!error) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchSales();
    } else {
      alert('Error al guardar: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('manual_sales').delete().eq('id', id);
    if (!error) {
      setSales(prev => prev.filter(s => s.id !== id));
      setDeleteConfirm(null);
    }
  };

  const handleMarkPaid = async (id) => {
    const { error } = await supabase.from('manual_sales').update({ status: 'paid' }).eq('id', id);
    if (!error) {
      setSales(prev => prev.map(s => s.id === id ? { ...s, status: 'paid' } : s));
    }
  };

  const debtSales = useMemo(() => sales.filter(s => s.status === 'debt'), [sales]);
  const totalDebt = useMemo(() => debtSales.reduce((a, s) => a + s.total_amount, 0), [debtSales]);
  const totalIncome = useMemo(() => sales.filter(s => s.status === 'paid').reduce((a, s) => a + s.total_amount, 0), [sales]);

  const filteredSales = sales.filter(s => filter === 'all' || s.status === filter);

  return (
    <div className="admin-page ms-page">
      {/* ── Header ── */}
      <div className="adm-page-header">
        <div className="adm-page-title">
          <h1>Ventas Manuales</h1>
          <span className="adm-count-pill">{sales.length} registros</span>
        </div>
        <div className="adm-page-actions">
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancelar' : '+ Registrar Venta'}
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="ms-kpi-row">
        <div className="ms-kpi-card">
          <span className="ms-kpi-label">Ingresos Manuales</span>
          <span className="ms-kpi-value green">${totalIncome.toLocaleString()}</span>
        </div>
        <div className="ms-kpi-card">
          <span className="ms-kpi-label">Deudas Pendientes</span>
          <span className="ms-kpi-value red">${totalDebt.toLocaleString()}</span>
        </div>
        <div className="ms-kpi-card">
          <span className="ms-kpi-label">Clientes en Deuda</span>
          <span className="ms-kpi-value">{debtSales.length}</span>
        </div>
      </div>

      {/* ── Debt Alert Panel ── */}
      {debtSales.length > 0 && (
        <div className="ms-debt-panel">
          <div className="ms-debt-panel-header">
            <span className="ms-debt-title">💰 Deudas por Cobrar</span>
            <span className="ms-debt-total">Total: ${totalDebt.toLocaleString()}</span>
          </div>
          <div className="ms-debt-list">
            {debtSales.map(s => (
              <div key={s.id} className="ms-debt-item">
                <div>
                  <p className="ms-debt-name">{s.customer_name}</p>
                  <p className="ms-debt-info">{s.items}</p>
                  {s.customer_phone && (
                    <a href={`https://wa.me/54${s.customer_phone.replace(/\D/g, '')}`} 
                       target="_blank" rel="noreferrer"
                       className="ms-whatsapp-link">
                      📱 WhatsApp {s.customer_phone}
                    </a>
                  )}
                </div>
                <div className="ms-debt-item-right">
                  <span className="ms-debt-amount">${s.total_amount.toLocaleString()}</span>
                  <button className="btn-primary ms-small-btn" onClick={() => handleMarkPaid(s.id)}>
                    ✓ Pagó
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── New Sale Form ── */}
      {showForm && (
        <div className="ms-form-card">
          <h3 className="section-title">📝 Nueva Venta</h3>
          <form onSubmit={handleSubmit} className="ms-form">
            <div className="form-row">
              <div className="form-group">
                <label>Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div className="form-group">
                <label>Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={form.customer_phone}
                  onChange={e => set('customer_phone', e.target.value)}
                  placeholder="Ej: 1134567890"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Productos / Descripción *</label>
              <textarea
                required
                rows={2}
                value={form.items}
                onChange={e => set('items', e.target.value)}
                placeholder="Ej: 1x Mate torpedo cuero natural + 1x Bombilla filtro"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Monto Total (ARS) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={form.total_amount}
                  onChange={e => set('total_amount', e.target.value)}
                  placeholder="Ej: 15000"
                />
              </div>
              <div className="form-group">
                <label>Método de Pago</label>
                <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Notas <span className="form-label-hint">(Opcional)</span></label>
              <input
                type="text"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Ej: Pagó en dos cuotas, o viene a buscar el martes..."
              />
            </div>

            <div className="ms-form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : '✓ Registrar Venta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Sales Table ── */}
      <div className="ms-table-card">
        <div className="ms-table-filters">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todas ({sales.length})</button>
          <button className={filter === 'paid' ? 'active' : ''} onClick={() => setFilter('paid')}>Pagadas</button>
          <button className={filter === 'debt' ? 'active' : ''} onClick={() => setFilter('debt')}>Deudas ({debtSales.length})</button>
        </div>

        {loading ? (
          <p className="ms-loading">Cargando ventas...</p>
        ) : filteredSales.length === 0 ? (
          <div className="ms-empty">
            <p>🧾 No hay ventas registradas en este filtro.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>Registrar primera venta</button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Método</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.id} className={sale.status === 'debt' ? 'ms-debt-row' : ''}>
                    <td>{new Date(sale.created_at).toLocaleDateString('es-AR', {day:'2-digit', month:'short', year:'2-digit'})}</td>
                    <td>
                      <div>
                        <strong>{sale.customer_name}</strong>
                        {sale.customer_phone && (
                          <a href={`https://wa.me/54${sale.customer_phone.replace(/\D/g,'')}`} 
                             target="_blank" rel="noreferrer"
                             style={{display:'block', fontSize:'0.75rem', color:'#25D366'}}>
                            {sale.customer_phone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{sale.items}</td>
                    <td><span className="ms-method-badge">{sale.payment_method}</span></td>
                    <td>
                      {sale.status === 'debt' 
                        ? <span className="status-badge pending">ME DEBE</span>
                        : <span className="status-badge paid">Pagado</span>
                      }
                    </td>
                    <td style={{fontWeight: 700, color: sale.status === 'debt' ? '#d97706' : 'var(--accent)'}}>
                      ${sale.total_amount.toLocaleString()}
                    </td>
                    <td>
                      <div className="ms-row-actions">
                        {sale.status === 'debt' && (
                          <button className="btn-primary ms-small-btn" onClick={() => handleMarkPaid(sale.id)}>
                            ✓ Pagó
                          </button>
                        )}
                        {deleteConfirm === sale.id ? (
                          <>
                            <button 
                              onClick={() => handleDelete(sale.id)}
                              style={{background:'#dc2626', color:'white', border:'none', borderRadius:'6px', padding:'0.3rem 0.6rem', cursor:'pointer', fontSize:'0.75rem', fontWeight:700}}>
                              Confirmar
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary ms-small-btn">No</button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirm(sale.id)} className="ms-delete-btn">
                            🗑
                          </button>
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
    </div>
  );
};

export default ManualSales;
