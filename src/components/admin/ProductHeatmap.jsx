import React, { useMemo, useState } from 'react';

/**
 * ProductHeatmap
 * Collapsible heatmap showing visit_count and click_count per product.
 * Collapsed by default so the product table is immediately accessible.
 *
 * Heat colours are always relative to the ACTIVE metric (not hardcoded to visits).
 *   🔥 top 20 %  🟠 next 30 %  🟡 next 30 %  ⚪ bottom 20 %
 */

const BAR_MAX_WIDTH = 120; // px

function heatColor(ratio) {
  if (ratio >= 0.8) return { bg: '#fef2f2', bar: '#ef4444', label: '🔥' };
  if (ratio >= 0.5) return { bg: '#fff7ed', bar: '#f97316', label: '🟠' };
  if (ratio >= 0.2) return { bg: '#fefce8', bar: '#eab308', label: '🟡' };
  return                   { bg: '#f9fafb', bar: '#9ca3af', label: '⚪' };
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? value / max : 0;
  const width = Math.max(4, Math.round(pct * BAR_MAX_WIDTH));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        width: BAR_MAX_WIDTH, height: 10,
        background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          width, height: '100%', background: color,
          borderRadius: 99, transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', minWidth: 28 }}>
        {value}
      </span>
    </div>
  );
}

const ProductHeatmap = ({ products }) => {
  const [open, setOpen]     = useState(false); // collapsed by default
  const [metric, setMetric] = useState('visit_count');

  const sorted = useMemo(() =>
    [...products].sort((a, b) => (b[metric] || 0) - (a[metric] || 0)),
    [products, metric]
  );

  const maxActive = useMemo(() =>
    Math.max(...products.map(p => p[metric] || 0), 1),
    [products, metric]
  );
  const maxVisits = useMemo(() => Math.max(...products.map(p => p.visit_count || 0), 1), [products]);
  const maxClicks = useMemo(() => Math.max(...products.map(p => p.click_count || 0), 1), [products]);

  if (!products || products.length === 0) return null;

  const totalVisits = products.reduce((s, p) => s + (p.visit_count || 0), 0);
  const totalClicks = products.reduce((s, p) => s + (p.click_count || 0), 0);

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      marginBottom: '2rem',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      {/* ── Collapsible Header ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          gap: '1rem',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)' }}>
            🔥 Heatmap de Productos
          </span>
          {/* Summary pills always visible */}
          <span style={{
            background: '#ecfdf5', color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: 20, padding: '0.15rem 0.6rem',
            fontSize: '0.75rem', fontWeight: 700,
          }}>
            👁 {totalVisits.toLocaleString()} visitas
          </span>
          <span style={{
            background: '#ede9fe', color: '#5b21b6',
            border: '1px solid #ddd6fe',
            borderRadius: 20, padding: '0.15rem 0.6rem',
            fontSize: '0.75rem', fontWeight: 700,
          }}>
            🖱 {totalClicks.toLocaleString()} clics
          </span>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-light)' }}>
            {products.length} productos
          </span>
        </div>
        <span style={{
          fontSize: '1.1rem', color: 'var(--text-light)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          flexShrink: 0,
        }}>▼</span>
      </button>

      {/* ── Expandable Body ── */}
      {open && (
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-light)' }}>
              Visitas a la página del producto vs. clics desde el catálogo
            </p>
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
                    fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >{label}</button>
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
                  {['#', 'Producto', '👁 Visitas', '🖱 Clics Cat.', 'Categoría'].map(h => (
                    <th key={h} style={{
                      padding: '0.5rem 0.75rem', textAlign: 'left',
                      color: 'var(--text-light)', fontWeight: 700,
                      fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((product, idx) => {
                  // Heat colour is relative to the active metric
                  const activeVal = product[metric] || 0;
                  const ratio = maxActive > 0 ? activeVal / maxActive : 0;
                  const heat  = heatColor(ratio);
                  return (
                    <tr key={product.id} style={{
                      background: heat.bg,
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: 'var(--text-light)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
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
                          borderRadius: 20, padding: '0.2rem 0.6rem',
                          fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dark)',
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
      )}
    </div>
  );
};

export default ProductHeatmap;
