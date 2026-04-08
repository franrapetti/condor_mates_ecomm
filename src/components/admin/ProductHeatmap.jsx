import React, { useMemo, useState } from 'react';

/**
 * ProductHeatmap
 * Visualises visit_count and click_count for every product as a colour-coded
 * heatmap grid. No extra DB fetch needed — products array is passed as a prop.
 *
 * Colours:
 *   🔴 hot  — top 20 %
 *   🟠 warm — next 30 %
 *   🟡 mild — next 30 %
 *   ⚪ cold — bottom 20 %
 */

const BAR_MAX_WIDTH = 120; // px

function heatColor(ratio) {
  if (ratio >= 0.8) return { bg: '#fef2f2', bar: '#ef4444', label: '🔥' };
  if (ratio >= 0.5) return { bg: '#fff7ed', bar: '#f97316', label: '🟠' };
  if (ratio >= 0.2) return { bg: '#fefce8', bar: '#eab308', label: '🟡' };
  return                   { bg: '#f9fafb', bar: '#9ca3af', label: '⚪' };
}

function MiniBar({ value, max, color }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * BAR_MAX_WIDTH)) : 4;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        width: BAR_MAX_WIDTH,
        height: 10,
        background: '#e5e7eb',
        borderRadius: 99,
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          width,
          height: '100%',
          background: color,
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', minWidth: 28 }}>
        {value}
      </span>
    </div>
  );
}

const ProductHeatmap = ({ products }) => {
  const [metric, setMetric] = useState('visit_count'); // 'visit_count' | 'click_count'

  const sorted = useMemo(() => {
    return [...products]
      .sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
  }, [products, metric]);

  const maxVisits = useMemo(() => Math.max(...products.map(p => p.visit_count || 0), 1), [products]);
  const maxClicks = useMemo(() => Math.max(...products.map(p => p.click_count || 0), 1), [products]);

  if (!products || products.length === 0) return null;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)' }}>
            🔥 Heatmap de Productos
          </h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-light)' }}>
            Visitas a la página del producto vs. clics desde el catálogo
          </p>
        </div>

        {/* Metric Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { key: 'visit_count', label: '👁 Visitas' },
            { key: 'click_count', label: '🖱 Clics catálogo' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: metric === key ? 'var(--accent)' : 'transparent',
                color: metric === key ? 'white' : 'var(--text-dark)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {[
          { label: '🔥 Top 20%', bg: '#fef2f2' },
          { label: '🟠 Activo',  bg: '#fff7ed' },
          { label: '🟡 Moderado',bg: '#fefce8' },
          { label: '⚪ Bajo',    bg: '#f9fafb' },
        ].map(({ label, bg }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-light)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: '1px solid #e5e7eb', display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-light)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>#</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-light)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Producto</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-light)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>👁 Visitas</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-light)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>🖱 Clics Cat.</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-light)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Categoría</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((product, idx) => {
              const visitRatio = maxVisits > 0 ? (product.visit_count || 0) / maxVisits : 0;
              const heat = heatColor(visitRatio);
              return (
                <tr
                  key={product.id}
                  style={{
                    background: heat.bg,
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.2s',
                  }}
                >
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: 'var(--text-light)', fontSize: '0.8rem' }}>
                    {heat.label} {idx + 1}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <img
                        src={product.image_url}
                        alt={product.name}
                        style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                      />
                      <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{product.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <MiniBar value={product.visit_count || 0} max={maxVisits} color="#10b981" />
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <MiniBar value={product.click_count || 0} max={maxClicks} color="#6366f1" />
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span style={{
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: 20,
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-dark)',
                    }}>
                      {product.category}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductHeatmap;
