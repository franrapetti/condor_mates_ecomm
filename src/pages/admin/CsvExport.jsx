import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Download, Filter, Info, Eye } from 'lucide-react';
import './CsvExport.css';
import './AdminProducts.css';

const CATEGORIES = [
  { value: 'Yerbas', emoji: '🧉' },
  { value: 'Bombillas', emoji: '🥄' },
  { value: 'Mates', emoji: '🫖' },
];

const BASE_DOMAIN = 'https://condormates.com.ar';

/**
 * Ensures an image URL is absolute.
 * If it already starts with http, returns as-is.
 * Otherwise, prepends the base domain.
 */
const ensureAbsoluteUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Ensure leading slash
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${BASE_DOMAIN}${path}`;
};

/**
 * Escapes a CSV field per RFC 4180:
 * wraps in quotes if it contains commas, quotes, or newlines.
 */
const escapeCsvField = (value) => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const CsvExport = () => {
  const [selected, setSelected] = useState(new Set());
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // ── Toggle a single category ──
  const toggleCategory = (cat) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ── Select / deselect all ──
  const toggleAll = () => {
    if (selected.size === CATEGORIES.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(CATEGORIES.map((c) => c.value)));
    }
  };

  const allSelected = selected.size === CATEGORIES.length;

  // ── Fetch products when selection changes ──
  const fetchProducts = useCallback(async () => {
    if (selected.size === 0) {
      setProducts([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, price, image_url, category')
        .in('category', Array.from(selected))
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error al consultar productos:', err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    fetchProducts();
    setDownloaded(false);
  }, [fetchProducts]);

  // ── Generate and download CSV ──
  const handleDownload = () => {
    if (products.length === 0) return;

    // CSV header
    const header = 'Nombre,Precio,URL_Imagen';

    // CSV rows
    const rows = products.map((p) => {
      const nombre = escapeCsvField(p.name);
      const precio = escapeCsvField(p.price ?? 0);
      const url = escapeCsvField(ensureAbsoluteUrl(p.image_url));
      return `${nombre},${precio},${url}`;
    });

    // BOM + content for UTF-8 compatibility
    const BOM = '\uFEFF';
    const csvContent = BOM + [header, ...rows].join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `canva_export_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 4000);
  };

  return (
    <div className="admin-page csv-export-page">
      {/* ── Page Header ── */}
      <div className="adm-page-header">
        <div className="adm-page-title">
          <h1>Exportar CSV para Canva</h1>
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="csv-info-banner">
        <Info size={18} />
        <div>
          Generá un archivo <strong>.csv</strong> listo para importar en{' '}
          <strong>Canva Bulk Create</strong>. Seleccioná las categorías que querés
          exportar y descargá el archivo con las columnas{' '}
          <strong>Nombre</strong>, <strong>Precio</strong> y <strong>URL_Imagen</strong>.
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="csv-filter-card">
        <h2 className="csv-filter-title">
          <Filter size={16} />
          Filtrar por categoría
        </h2>

        <button
          className="csv-select-all"
          onClick={toggleAll}
          type="button"
        >
          {allSelected ? '✕ Deseleccionar todo' : '☑ Seleccionar todo'}
        </button>

        <div className="csv-checkbox-group">
          {CATEGORIES.map(({ value, emoji }) => (
            <label
              key={value}
              className={`csv-checkbox-label${selected.has(value) ? ' checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={selected.has(value)}
                onChange={() => toggleCategory(value)}
              />
              {emoji} {value}
            </label>
          ))}
        </div>

        {/* ── Action Bar ── */}
        <div className="csv-action-bar">
          <button
            className="btn-primary"
            onClick={handleDownload}
            disabled={products.length === 0 || loading}
            type="button"
          >
            <Download size={16} />
            Generar y Descargar CSV
          </button>

          {loading && (
            <span className="csv-loading">
              <span className="csv-spinner" />
              Consultando...
            </span>
          )}

          {!loading && selected.size > 0 && (
            <span className="csv-result-pill">
              <strong>{products.length}</strong> producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
            </span>
          )}

          {downloaded && (
            <span className="csv-success-msg">
              ✅ CSV descargado correctamente
            </span>
          )}
        </div>
      </div>

      {/* ── Preview Table ── */}
      {selected.size > 0 && (
        <div className="csv-preview-card">
          <div className="csv-preview-header">
            <h3>
              <Eye size={15} />
              Vista previa
            </h3>
            {products.length > 0 && (
              <span className="csv-preview-badge">
                {products.length} fila{products.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div className="csv-empty-state">
              <span className="csv-spinner" style={{ width: 24, height: 24, margin: '0 auto 1rem' }} />
              <p>Cargando productos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="csv-empty-state">
              <span className="csv-empty-icon">📭</span>
              <p>No se encontraron productos en las categorías seleccionadas</p>
            </div>
          ) : (
            <table className="csv-preview-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>URL_Imagen</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <div className="csv-thumb-cell">
                        <img
                          src={ensureAbsoluteUrl(p.image_url)}
                          alt={p.name}
                          className="csv-thumb"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span className="col-name">{p.name}</span>
                      </div>
                    </td>
                    <td className="col-stock">${p.price?.toLocaleString() ?? 0}</td>
                    <td className="col-url" title={ensureAbsoluteUrl(p.image_url)}>
                      {ensureAbsoluteUrl(p.image_url)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default CsvExport;
