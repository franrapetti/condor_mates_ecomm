import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './AdminLeads.css';

const AdminLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setLeads(data || []);
      } catch (err) {
        console.error('Error fetching leads:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.email.toLowerCase().includes(q) ||
      (l.source || '').toLowerCase().includes(q)
    );
  }, [leads, search]);

  // Stats
  const totalLeads = leads.length;
  const thisMonth = leads.filter(l => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const sources = leads.reduce((acc, l) => {
    const src = l.source || 'desconocido';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});
  const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];

  const exportToCSV = () => {
    const headers = 'Email,Origen,Fecha de Registro\n';
    const rows = filteredLeads.map(l =>
      `"${l.email}","${l.source || 'desconocido'}","${new Date(l.created_at).toLocaleDateString('es-AR')}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `leads_condor_mates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-page">
      <div className="adm-page-header">
        <div className="adm-page-title">
          <h1>📧 Contactos Capturados</h1>
          <span className="adm-count-pill">{totalLeads} leads</span>
        </div>
        <button
          onClick={exportToCSV}
          className="leads-export-btn"
          disabled={filteredLeads.length === 0}
        >
          📥 Exportar CSV
        </button>
      </div>

      {/* Stats Row */}
      <div className="leads-stats-row">
        <div className="leads-stat-card">
          <h4>Total de Leads</h4>
          <div className="stat-value">{totalLeads}</div>
          <div className="stat-sub">Emails únicos capturados</div>
        </div>
        <div className="leads-stat-card">
          <h4>Este Mes</h4>
          <div className="stat-value">{thisMonth}</div>
          <div className="stat-sub">Nuevos contactos</div>
        </div>
        <div className="leads-stat-card">
          <h4>Fuente Principal</h4>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>
            {topSource ? topSource[0] : '—'}
          </div>
          <div className="stat-sub">{topSource ? `${topSource[1]} leads` : 'Sin datos'}</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="🔍 Buscar por email u origen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '0.65rem 1rem',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        />
      </div>

      {/* Table */}
      <div className="leads-table-container">
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)' }}>Cargando contactos...</p>
        ) : filteredLeads.length === 0 ? (
          <div className="leads-empty-state">
            <div className="empty-icon">📭</div>
            <p><strong>No hay leads capturados aún.</strong></p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>Los contactos se registran automáticamente cuando los usuarios dejan su email en el popup de salida.</p>
          </div>
        ) : (
          <table className="leads-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Email</th>
                <th>Origen</th>
                <th>Fecha de Registro</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead, idx) => (
                <tr key={lead.id}>
                  <td style={{ color: 'var(--text-light)', fontWeight: 600, width: 40 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 700 }}>{lead.email}</td>
                  <td>
                    <span className="leads-source-badge">{lead.source || 'desconocido'}</span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>
                    {new Date(lead.created_at).toLocaleString('es-AR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tips */}
      {totalLeads > 0 && (
        <div style={{
          marginTop: '1.5rem',
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 12, padding: '1rem 1.25rem',
          fontSize: '0.82rem', color: '#1e40af',
        }}>
          <strong>💡 Consejo:</strong> Exportá el CSV y subilo a tu plataforma de Email Marketing
          (Mailchimp, Brevo, Resend) para enviarles campañas promocionales segmentadas.
          Estos leads ya mostraron intención de compra al interactuar con el popup de descuento.
        </div>
      )}
    </div>
  );
};

export default AdminLeads;
