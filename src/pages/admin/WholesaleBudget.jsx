import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Save, Download, Trash2, RotateCcw, ChevronDown, ChevronUp,
  Upload, Package, TrendingUp, CreditCard, Plus, Minus, Search, X, ShoppingCart,
  FileText, Pencil
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './WholesaleBudget.css';
import './AdminProducts.css';

// ── Comisiones de Mercado Pago Argentina (2025/2026) ──
const COMMISSION_PRESETS = [
  { id: 'none',               label: 'Sin comisión',                  rate: 0 },
  { id: 'checkout_35d',       label: 'Checkout Online — 35 días',     rate: 0.0179 },
  { id: 'checkout_18d',       label: 'Checkout Online — 18 días',     rate: 0.0360 },
  { id: 'checkout_10d',       label: 'Checkout Online — 10 días',     rate: 0.0450 },
  { id: 'checkout_instant',   label: 'Checkout Online — Inmediato',   rate: 0.0660 },
  { id: 'point_debit_2d',     label: 'Point Débito — 2 días',         rate: 0.0299 },
  { id: 'point_debit_instant',label: 'Point Débito — Inmediato',      rate: 0.0341 },
  { id: 'point_credit_30d',   label: 'Point Crédito — 30 días',       rate: 0.0179 },
  { id: 'point_credit_instant',label:'Point Crédito — Inmediato',     rate: 0.0660 },
  { id: 'qr_wallet',          label: 'QR Débito / Cuenta MP',         rate: 0.0135 },
  { id: 'qr_credit',          label: 'QR Crédito',                    rate: 0.0660 },
  { id: 'custom',             label: 'Personalizado',                 rate: 0 },
];

const INSTALLMENT_OPTIONS = [
  { id: 'none', label: 'Sin cuotas',              rate: 0 },
  { id: '3',    label: '3 cuotas sin interés',     rate: 0.10 },
  { id: '6',    label: '6 cuotas sin interés',     rate: 0.18 },
  { id: '9',    label: '9 cuotas sin interés',     rate: 0.225 },
  { id: '12',   label: '12 cuotas sin interés',    rate: 0.29 },
];

const IVA_RATE = 0.21;

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const pct = (n) => `${(Number(n || 0) * 100).toFixed(2)}%`;

// ═══════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════
const WholesaleBudget = () => {
  // ── State ──
  const [budgetName, setBudgetName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientBusiness, setClientBusiness] = useState('');
  const [clientCuit, setClientCuit] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState([]); // [{product_id, name, quantity, unit_price, image_url}]
  const [discountPercent, setDiscountPercent] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [commissionPreset, setCommissionPreset] = useState('none');
  const [installments, setInstallments] = useState('none');
  const [customCommission, setCustomCommission] = useState(5);

  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customProductName, setCustomProductName] = useState('');
  const [customProductPrice, setCustomProductPrice] = useState('');
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMode, setExportMode] = useState('client');
  const [editingFileName, setEditingFileName] = useState(false);
  const exportRef = useRef(null);

  // ── Fetch products from Supabase ──
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, category, sub_category, image_url, stock, promo_price')
          .order('category')
          .order('name');
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error loading products:', err);
        // Fallback to local data
        try {
          const { products: localProducts } = await import('../../data/products.js');
          setProducts(localProducts || []);
        } catch { setProducts([]); }
      }
    })();
  }, []);

  // ── Fetch saved budgets ──
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('wholesale_budgets')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          if (error.code === '42P01') console.warn('Tabla wholesale_budgets no existe. Ejecutá setup_wholesale_budget.sql.');
          else throw error;
        }
        setBudgets(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Filtered products for search ──
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.sub_category || '').toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  // ── Real-time calculations ──
  const results = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const dp = Number(discountPercent) || 0;
    const discountAmount = subtotal * (dp / 100);
    const afterDiscount = subtotal - discountAmount;
    const pkg = Number(packagingCost) || 0;
    const ship = Number(shippingCost) || 0;
    const totalNoCommission = afterDiscount + pkg + ship;

    // Commission
    const preset = COMMISSION_PRESETS.find(p => p.id === commissionPreset);
    const baseRate = commissionPreset === 'custom'
      ? (Number(customCommission) || 0) / 100
      : (preset?.rate || 0);
    const installmentOpt = INSTALLMENT_OPTIONS.find(i => i.id === installments);
    const installmentRate = installmentOpt?.rate || 0;
    const totalCommissionRate = (baseRate + installmentRate) * (1 + IVA_RATE);

    const totalWithCommission = totalCommissionRate < 1
      ? totalNoCommission / (1 - totalCommissionRate)
      : totalNoCommission;

    const commissionAmount = totalWithCommission - totalNoCommission;

    return {
      subtotal,
      discountAmount,
      afterDiscount,
      totalNoCommission,
      totalWithCommission,
      totalCommissionRate,
      commissionAmount,
      baseRate,
      installmentRate,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [items, discountPercent, packagingCost, shippingCost, commissionPreset, installments, customCommission]);

  // ── Export filename ──
  const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const defaultExportFileName = `PRESUPUESTO ${budgetName || 'Mayorista'} ${dateStr}`;
  const [exportFileName, setExportFileName] = useState('');
  // Sync default name when budgetName changes
  useEffect(() => {
    const d = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    setExportFileName(`PRESUPUESTO ${budgetName || 'Mayorista'} ${d}`);
  }, [budgetName]);

  // ── Item management ──
  const addProduct = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.promo_price || product.price,
        image_url: product.image_url || product.image || '',
      }];
    });
  };

  const addCustomProduct = (e) => {
    e.preventDefault();
    if (!customProductName.trim()) return;
    const price = Number(customProductPrice) || 0;
    const customId = `custom_${Date.now()}`;
    setItems(prev => [...prev, {
      product_id: customId,
      name: customProductName.trim(),
      quantity: 1,
      unit_price: price,
      image_url: '',
    }]);
    setCustomProductName('');
    setCustomProductPrice('');
  };

  const updateItemQuantity = (productId, delta) => {
    setItems(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = Math.max(1, i.quantity + delta);
      return { ...i, quantity: newQty };
    }));
  };

  const updateItemPrice = (productId, newPrice) => {
    setItems(prev => prev.map(i =>
      i.product_id === productId ? { ...i, unit_price: Number(newPrice) || 0 } : i
    ));
  };

  const updateItemQuantityDirect = (productId, newQty) => {
    setItems(prev => prev.map(i =>
      i.product_id === productId ? { ...i, quantity: Math.max(1, Number(newQty) || 1) } : i
    ));
  };

  const removeItem = (productId) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  };

  // ── Save to Supabase ──
  const handleSave = async () => {
    if (items.length === 0) {
      alert('Agregá al menos un producto al presupuesto.');
      return;
    }
    setSaving(true);
    try {
      const preset = COMMISSION_PRESETS.find(p => p.id === commissionPreset);
      const payload = {
        budget_name: budgetName || `Presupuesto ${new Date().toLocaleDateString('es-AR')}`,
        client_name: clientName,
        client_business: clientBusiness,
        client_cuit: clientCuit,
        client_phone: clientPhone,
        notes,
        items: items.map(i => ({
          product_id: i.product_id,
          name: i.name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.quantity * i.unit_price,
        })),
        subtotal: results.subtotal,
        discount_percent: Number(discountPercent) || 0,
        discount_amount: results.discountAmount,
        packaging: Number(packagingCost) || 0,
        shipping: Number(shippingCost) || 0,
        total_without_commission: results.totalNoCommission,
        commission_type: commissionPreset === 'custom'
          ? `Personalizado (${customCommission}%)`
          : (preset?.label || 'Sin comisión'),
        commission_rate: results.totalCommissionRate,
        installments,
        total_with_commission: results.totalWithCommission,
      };

      const { data, error } = await supabase
        .from('wholesale_budgets')
        .insert([payload])
        .select();

      if (error) throw error;
      setBudgets(prev => [data[0], ...prev]);
      alert('✅ Presupuesto guardado');
    } catch (err) {
      console.error(err);
      alert('Error al guardar. ¿Ejecutaste setup_wholesale_budget.sql en Supabase?');
    } finally {
      setSaving(false);
    }
  };

  // ── Export to PNG ──
  // ── Shared capture logic ──
  const captureTemplate = async (mode) => {
    setExportMode(mode);
    // Wait for DOM update
    await new Promise(r => setTimeout(r, 150));

    const element = exportRef.current;
    if (!element) throw new Error('Export template not found');

    element.style.display = 'block';
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#FFFDF7',
      logging: false,
      useCORS: true,
      windowWidth: 600,
    });
    element.style.display = 'none';
    return canvas;
  };

  const sanitizeFileName = (name) => name.replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, ' ').trim();

  // ── Export as PNG ──
  const handleExportPNG = async (mode = 'client') => {
    setShowExportMenu(false);
    try {
      const canvas = await captureTemplate(mode);
      const link = document.createElement('a');
      link.download = `${sanitizeFileName(exportFileName)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error al exportar PNG:', error);
      alert('Error al exportar el presupuesto como imagen');
      if (exportRef.current) exportRef.current.style.display = 'none';
    }
  };

  // ── Export as PDF ──
  const handleExportPDF = async (mode = 'client') => {
    setShowExportMenu(false);
    try {
      const canvas = await captureTemplate(mode);
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${sanitizeFileName(exportFileName)}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar el presupuesto como PDF');
      if (exportRef.current) exportRef.current.style.display = 'none';
    }
  };

  // ── Load budget from history ──
  const loadBudget = (b) => {
    setBudgetName(b.budget_name || '');
    setClientName(b.client_name || '');
    setClientBusiness(b.client_business || '');
    setClientCuit(b.client_cuit || '');
    setClientPhone(b.client_phone || '');
    setNotes(b.notes || '');
    setDiscountPercent(b.discount_percent || 0);
    setPackagingCost(b.packaging || 0);
    setShippingCost(b.shipping || 0);
    setInstallments(b.installments || 'none');
    setCommissionPreset('none');
    setItems((b.items || []).map(i => ({
      product_id: i.product_id,
      name: i.name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      image_url: '',
    })));
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBudget = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este presupuesto?')) return;
    try {
      const { error } = await supabase.from('wholesale_budgets').delete().eq('id', id);
      if (error) throw error;
      setBudgets(prev => prev.filter(b => b.id !== id));
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setBudgetName('');
    setClientName('');
    setClientBusiness('');
    setClientCuit('');
    setClientPhone('');
    setNotes('');
    setItems([]);
    setDiscountPercent(0);
    setPackagingCost(0);
    setShippingCost(0);
    setCommissionPreset('none');
    setInstallments('none');
    setCustomCommission(5);
    setSearchQuery('');
    setCustomProductName('');
    setCustomProductPrice('');
    setExportFileName('');
  };

  // Helper: check if any client info is filled
  const hasClientInfo = clientName || clientBusiness || clientCuit || clientPhone;

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div className="admin-page">
      {/* Header */}
      <div className="adm-page-header">
        <div className="adm-page-title">
          <h1>🧉 Presupuestador Mayorista</h1>
        </div>
      </div>

      {/* Budget Name */}
      <div className="ws-name-input">
        <input
          type="text"
          placeholder="Nombre del presupuesto (ej: Pedido Mayorista — Distribuidora Norte)"
          value={budgetName}
          onChange={e => setBudgetName(e.target.value)}
        />
      </div>

      <div className="ws-layout">
        {/* ═══ COLUMNA IZQUIERDA ═══ */}
        <div className="ws-inputs">

          {/* ── Datos del Cliente ── */}
          <div className="ws-section accent-forest">
            <div className="ws-section-header">
              <span className="ws-section-icon">👤</span>
              <h3>Datos del Cliente</h3>
              <span className="ws-section-hint">(opcional)</span>
            </div>
            <div className="ws-fields-grid">
              <div className="ws-field">
                <label>Nombre / Contacto</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="ws-field">
                <label>Razón Social</label>
                <input
                  type="text"
                  value={clientBusiness}
                  onChange={e => setClientBusiness(e.target.value)}
                  placeholder="Distribuidora Norte S.R.L."
                />
              </div>
              <div className="ws-field">
                <label>CUIT</label>
                <input
                  type="text"
                  value={clientCuit}
                  onChange={e => setClientCuit(e.target.value)}
                  placeholder="20-12345678-9"
                />
              </div>
              <div className="ws-field">
                <label>Teléfono</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="+54 9 351 123-4567"
                />
              </div>
            </div>
          </div>

          {/* ── Selector de Productos ── */}
          <div className="ws-section accent-yerba">
            <div className="ws-section-header">
              <span className="ws-section-icon"><ShoppingCart size={18} /></span>
              <h3>Agregar Productos</h3>
            </div>
            <div className="ws-search-bar">
              <Search size={16} className="ws-search-icon" />
              <input
                type="text"
                placeholder="Buscar producto por nombre o categoría..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="ws-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="ws-products-list">
              {filteredProducts.length === 0 ? (
                <div className="ws-products-empty">No se encontraron productos</div>
              ) : (
                filteredProducts.map(p => {
                  const inBudget = items.some(i => i.product_id === p.id);
                  return (
                    <div
                      key={p.id}
                      className={`ws-product-row${inBudget ? ' ws-product-row--added' : ''}`}
                      onClick={() => addProduct(p)}
                    >
                      <div className="ws-product-info">
                        <span className="ws-product-name">{p.name}</span>
                        <span className="ws-product-cat">{p.category}{p.sub_category ? ` · ${p.sub_category}` : ''}</span>
                      </div>
                      <div className="ws-product-price">{fmt(p.promo_price || p.price)}</div>
                      <button
                        className={`ws-add-btn${inBudget ? ' ws-add-btn--added' : ''}`}
                        onClick={(e) => { e.stopPropagation(); addProduct(p); }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <form className="ws-custom-product-form" onSubmit={addCustomProduct}>
              <div className="ws-custom-product-header">
                <h4>Añadir Producto Personalizado</h4>
              </div>
              <div className="ws-custom-product-inputs">
                <input
                  type="text"
                  placeholder="Nombre del producto..."
                  value={customProductName}
                  onChange={e => setCustomProductName(e.target.value)}
                  className="ws-custom-name-input"
                />
                <div className="ws-custom-price-input">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    placeholder="Precio"
                    value={customProductPrice}
                    onChange={e => setCustomProductPrice(e.target.value)}
                  />
                </div>
                <button type="submit" className="ws-add-custom-btn" disabled={!customProductName.trim()}>
                  <Plus size={16} />
                </button>
              </div>
            </form>
          </div>

          {/* ── Items del Presupuesto ── */}
          {items.length > 0 && (
            <div className="ws-section accent-mate">
              <div className="ws-section-header">
                <span className="ws-section-icon"><Package size={18} /></span>
                <h3>Items del Presupuesto</h3>
                <span className="ws-item-count">{items.length} {items.length === 1 ? 'producto' : 'productos'} · {results.itemCount} unidades</span>
              </div>
              <div className="ws-items-table">
                <div className="ws-items-header">
                  <span className="ws-col-name">Producto</span>
                  <span className="ws-col-price">Precio Unit.</span>
                  <span className="ws-col-qty">Cant.</span>
                  <span className="ws-col-subtotal">Subtotal</span>
                  <span className="ws-col-actions"></span>
                </div>
                {items.map(item => (
                  <div key={item.product_id} className="ws-item-row">
                    <span className="ws-col-name ws-item-name">{item.name}</span>
                    <span className="ws-col-price">
                      <input
                        type="number"
                        className="ws-inline-input"
                        value={item.unit_price}
                        onChange={e => updateItemPrice(item.product_id, e.target.value)}
                        min="0"
                      />
                    </span>
                    <span className="ws-col-qty">
                      <div className="ws-qty-control">
                        <button onClick={() => updateItemQuantity(item.product_id, -1)}><Minus size={12} /></button>
                        <input
                          type="number"
                          className="ws-qty-input"
                          value={item.quantity}
                          onChange={e => updateItemQuantityDirect(item.product_id, e.target.value)}
                          min="1"
                        />
                        <button onClick={() => updateItemQuantity(item.product_id, 1)}><Plus size={12} /></button>
                      </div>
                    </span>
                    <span className="ws-col-subtotal ws-item-subtotal">{fmt(item.quantity * item.unit_price)}</span>
                    <span className="ws-col-actions">
                      <button className="ws-remove-btn" onClick={() => removeItem(item.product_id)} title="Quitar">
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Extras & Comisiones ── */}
          <div className="ws-section accent-amber">
            <div className="ws-section-header">
              <span className="ws-section-icon"><TrendingUp size={18} /></span>
              <h3>Descuentos, Extras & Comisiones</h3>
            </div>
            <div className="ws-fields-grid">
              <div className="ws-field">
                <label>Descuento mayorista (%)</label>
                <div className="ws-input-with-unit">
                  <input
                    type="number"
                    step="1"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(e.target.value)}
                    placeholder="0"
                  />
                  <span className="ws-input-unit">%</span>
                </div>
              </div>
              <div className="ws-field">
                <label>Packaging ($)</label>
                <input
                  type="number"
                  value={packagingCost}
                  onChange={e => setPackagingCost(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="ws-field">
                <label>Envío ($)</label>
                <input
                  type="number"
                  value={shippingCost}
                  onChange={e => setShippingCost(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="ws-field">
                <label>Cuotas sin interés</label>
                <select
                  value={installments}
                  onChange={e => setInstallments(e.target.value)}
                >
                  {INSTALLMENT_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="ws-field full-width">
                <label><CreditCard size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Tipo de cobro Mercado Pago</label>
                <select
                  value={commissionPreset}
                  onChange={e => setCommissionPreset(e.target.value)}
                >
                  {COMMISSION_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label}{p.id !== 'custom' && p.id !== 'none' ? ` (${(p.rate * 100).toFixed(2)}% + IVA)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {commissionPreset === 'custom' && (
                <div className="ws-field full-width">
                  <label>Comisión personalizada (%)</label>
                  <div className="ws-input-with-unit">
                    <input
                      type="number"
                      step="0.1"
                      value={customCommission}
                      onChange={e => setCustomCommission(e.target.value)}
                      placeholder="5"
                    />
                    <span className="ws-input-unit">%</span>
                  </div>
                </div>
              )}
              <div className="ws-field full-width">
                <label>Observaciones</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notas internas o condiciones especiales..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ COLUMNA DERECHA: RESULTADOS ═══ */}
        <div className="ws-results">
          <div className="ws-results-card">
            <div className="ws-results-title">Resumen del presupuesto</div>

            {/* Client info (only if filled) */}
            {hasClientInfo && (
              <div className="ws-client-summary">
                {clientName && <div className="ws-client-row"><span className="ws-client-label">Cliente:</span> {clientName}</div>}
                {clientBusiness && <div className="ws-client-row"><span className="ws-client-label">Razón Social:</span> {clientBusiness}</div>}
                {clientCuit && <div className="ws-client-row"><span className="ws-client-label">CUIT:</span> {clientCuit}</div>}
                {clientPhone && <div className="ws-client-row"><span className="ws-client-label">Tel:</span> {clientPhone}</div>}
              </div>
            )}

            {/* Items summary */}
            {items.length === 0 ? (
              <div className="ws-empty-state">
                <ShoppingCart size={32} strokeWidth={1.5} />
                <p>Agregá productos para armar el presupuesto</p>
              </div>
            ) : (
              <>
                <div className="ws-breakdown">
                  {items.map(item => (
                    <div key={item.product_id} className="ws-breakdown-row">
                      <span className="ws-breakdown-label">
                        {item.name} <span className="ws-breakdown-qty">×{item.quantity}</span>
                      </span>
                      <span className="ws-breakdown-value">{fmt(item.quantity * item.unit_price)}</span>
                    </div>
                  ))}
                </div>

                {/* Subtotal */}
                <div className="ws-total-row ws-subtotal-row">
                  <span className="ws-total-label">Subtotal ({results.itemCount} un.)</span>
                  <span className="ws-total-value-sm">{fmt(results.subtotal)}</span>
                </div>

                {/* Discount */}
                {Number(discountPercent) > 0 && (
                  <div className="ws-discount-row">
                    <span className="ws-discount-label">Descuento {discountPercent}%</span>
                    <span className="ws-discount-value">-{fmt(results.discountAmount)}</span>
                  </div>
                )}

                {/* Packaging & Shipping */}
                {Number(packagingCost) > 0 && (
                  <div className="ws-breakdown-row ws-extra-row">
                    <span className="ws-breakdown-label">Packaging</span>
                    <span className="ws-breakdown-value">+{fmt(packagingCost)}</span>
                  </div>
                )}
                {Number(shippingCost) > 0 && (
                  <div className="ws-breakdown-row ws-extra-row">
                    <span className="ws-breakdown-label">Envío</span>
                    <span className="ws-breakdown-value">+{fmt(shippingCost)}</span>
                  </div>
                )}

                {/* Price cards */}
                <div className="ws-price-cards">
                  <div className="ws-price-card green">
                    <div className="ws-price-card-label">Precio Contado / Transferencia</div>
                    <div className="ws-price-card-value">{fmt(results.totalNoCommission)}</div>
                    {Number(discountPercent) > 0 && (
                      <div className="ws-price-card-sub">Con {discountPercent}% de descuento</div>
                    )}
                  </div>
                  {commissionPreset !== 'none' && (
                    <div className="ws-price-card mate">
                      <div className="ws-price-card-label">Precio con Mercado Pago</div>
                      <div className="ws-price-card-value">{fmt(results.totalWithCommission)}</div>
                      <div className="ws-price-card-sub">
                        Comisión: {pct(results.totalCommissionRate)} · Recargo: {fmt(results.commissionAmount)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Commission info */}
                {commissionPreset !== 'none' && (
                  <div className="ws-commission-info">
                    Base: <span>{pct(results.baseRate)}</span>
                    {results.installmentRate > 0 && <> + Cuotas: <span>{pct(results.installmentRate)}</span></>}
                    {' '}+ IVA 21% = <span>{pct(results.totalCommissionRate)}</span>
                  </div>
                )}
              </>
            )}

            {/* Export filename */}
            <div className="ws-export-filename">
              <div className="ws-export-filename-header">
                <FileText size={14} />
                <span className="ws-export-filename-label">Nombre del archivo</span>
                <button
                  className="ws-export-filename-edit"
                  onClick={() => setEditingFileName(!editingFileName)}
                  title="Editar nombre"
                >
                  <Pencil size={12} />
                </button>
              </div>
              {editingFileName ? (
                <input
                  type="text"
                  className="ws-export-filename-input"
                  value={exportFileName}
                  onChange={e => setExportFileName(e.target.value)}
                  onBlur={() => setEditingFileName(false)}
                  onKeyDown={e => e.key === 'Enter' && setEditingFileName(false)}
                  autoFocus
                />
              ) : (
                <div className="ws-export-filename-preview" onClick={() => setEditingFileName(true)}>
                  {exportFileName || defaultExportFileName}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="ws-actions">
              <button className="ws-btn ws-btn-save" onClick={handleSave} disabled={saving || items.length === 0}>
                <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>

              <div className="export-dropdown-container" style={{ position: 'relative' }}>
                <button
                  className="ws-btn ws-btn-export"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={items.length === 0}
                >
                  <Download size={16} /> Exportar <ChevronDown size={14} style={{ marginLeft: '4px' }} />
                </button>

                {showExportMenu && (
                  <div className="export-dropdown-menu">
                    <div className="export-dropdown-section-label">PDF</div>
                    <button onClick={() => handleExportPDF('client')}>
                      📄 PDF Cliente (Contado)
                    </button>
                    <button onClick={() => handleExportPDF('client_comm')}>
                      📄 PDF Cliente (Mercado Pago)
                    </button>
                    <button onClick={() => handleExportPDF('internal')}>
                      📄 PDF Interno (con comisiones)
                    </button>
                    <div className="export-dropdown-divider"></div>
                    <div className="export-dropdown-section-label">Imagen PNG</div>
                    <button onClick={() => handleExportPNG('client')}>
                      🖼️ PNG Cliente (Contado)
                    </button>
                    <button onClick={() => handleExportPNG('client_comm')}>
                      🖼️ PNG Cliente (Mercado Pago)
                    </button>
                    <button onClick={() => handleExportPNG('internal')}>
                      🖼️ PNG Interno (con comisiones)
                    </button>
                  </div>
                )}
              </div>

              <button className="ws-btn ws-btn-reset" onClick={resetForm} title="Resetear valores">
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ HISTORIAL ═══ */}
      <div className="ws-history-section">
        <button
          className="ws-history-toggle"
          onClick={() => setShowHistory(!showHistory)}
        >
          <h3>📋 Presupuestos Guardados</h3>
          <span className="badge-count">{budgets.length}</span>
          {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showHistory && (
          <div className="ws-history-content">
            {loading ? (
              <div className="ws-history-empty">Cargando...</div>
            ) : budgets.length === 0 ? (
              <div className="ws-history-empty">
                No hay presupuestos guardados aún. Armá un presupuesto y hacé click en <strong>Guardar</strong>.
              </div>
            ) : (
              <div className="ws-history-grid">
                {budgets.map(b => (
                  <div key={b.id} className="ws-history-card" onClick={() => loadBudget(b)}>
                    <div className="ws-history-card-header">
                      <span className="ws-history-card-name">{b.budget_name}</span>
                      <span className="ws-history-card-date">
                        {new Date(b.created_at).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    {(b.client_name || b.client_business) && (
                      <div className="ws-history-client">
                        {b.client_name || b.client_business}
                      </div>
                    )}
                    <div className="ws-history-card-prices">
                      <div className="ws-history-price">
                        <div className="ws-history-price-label">Contado</div>
                        <div className="ws-history-price-value">{fmt(b.total_without_commission)}</div>
                      </div>
                      <div className="ws-history-price">
                        <div className="ws-history-price-label">Con MP</div>
                        <div className="ws-history-price-value">{fmt(b.total_with_commission)}</div>
                      </div>
                    </div>
                    <div className="ws-history-items-count">
                      {(b.items || []).length} productos · {(b.items || []).reduce((s, i) => s + (i.quantity || 0), 0)} unidades
                    </div>
                    <div className="ws-history-card-actions">
                      <button className="ws-history-btn" onClick={(e) => { e.stopPropagation(); loadBudget(b); }}>
                        <Upload size={13} /> Cargar
                      </button>
                      <button className="ws-history-btn danger" onClick={(e) => deleteBudget(b.id, e)}>
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ EXPORT TEMPLATE (hidden, capturado por html2canvas) ═══ */}
      <div ref={exportRef} className="ws-export-template">
        <div className="ws-export-top">
          <img src="/logo.png" alt="Cóndor Mates" className="ws-export-logo" />
          <div className="ws-export-brand">CÓNDOR MATES</div>
          <div className="ws-export-tagline">Mates Artesanales · Río Segundo, Córdoba</div>
        </div>

        <div className="ws-export-divider"></div>

        <div className="ws-export-meta-row">
          <div className="meta-col">
            <span className="meta-label">PRESUPUESTO</span>
            <span className="meta-value">#{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
          </div>
          <div className="meta-col text-right">
            <span className="meta-label">FECHA</span>
            <span className="meta-value">{new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Client info in export — only shows filled fields */}
        {hasClientInfo && (
          <>
            <div className="ws-export-divider thin"></div>
            <div className="ws-export-client-block">
              {clientName && <div className="ws-export-client-line"><span className="meta-label">CLIENTE</span> <span className="meta-value">{clientName}</span></div>}
              {clientBusiness && <div className="ws-export-client-line"><span className="meta-label">RAZÓN SOCIAL</span> <span className="meta-value">{clientBusiness}</span></div>}
              {clientCuit && <div className="ws-export-client-line"><span className="meta-label">CUIT</span> <span className="meta-value">{clientCuit}</span></div>}
              {clientPhone && <div className="ws-export-client-line"><span className="meta-label">TELÉFONO</span> <span className="meta-value">{clientPhone}</span></div>}
            </div>
          </>
        )}

        <div className="ws-export-divider thin"></div>

        <div className="ws-export-detail-row">
          <span className="meta-label">DETALLE</span>
          <span className="meta-value-large">{budgetName || 'Presupuesto Mayorista'}</span>
        </div>

        <div className="ws-export-divider"></div>

        {/* Items table */}
        <div className="ws-export-table-section">
          <span className="meta-label">{exportMode === 'internal' ? 'DETALLE DE PRODUCTOS (INTERNO)' : 'DETALLE DEL PEDIDO'}</span>
          <table className="ws-export-table">
            <thead>
              <tr>
                <th>PRODUCTO</th>
                <th>P. UNIT.</th>
                <th>CANT.</th>
                <th>SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.product_id}>
                  <td>{item.name}</td>
                  <td>{fmt(item.unit_price)}</td>
                  <td>{item.quantity}</td>
                  <td>{fmt(item.quantity * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ws-export-divider"></div>

        {/* Totals */}
        <div className="ws-export-totals">
          <div className="ws-export-totals-row">
            <span>Subtotal ({results.itemCount} unidades)</span>
            <span>{fmt(results.subtotal)}</span>
          </div>
          {Number(discountPercent) > 0 && (
            <div className="ws-export-totals-row ws-export-discount">
              <span>Descuento {discountPercent}%</span>
              <span>-{fmt(results.discountAmount)}</span>
            </div>
          )}
          {Number(packagingCost) > 0 && (
            <div className="ws-export-totals-row">
              <span>Packaging</span>
              <span>+{fmt(packagingCost)}</span>
            </div>
          )}
          {Number(shippingCost) > 0 && (
            <div className="ws-export-totals-row">
              <span>Envío</span>
              <span>+{fmt(shippingCost)}</span>
            </div>
          )}
        </div>

        <div className="ws-export-divider"></div>

        <div className="ws-export-total-final">
          <span className="total-label">TOTAL</span>
          <span className="total-value">
            {exportMode === 'client_comm'
              ? fmt(results.totalWithCommission)
              : fmt(results.totalNoCommission)}
          </span>
        </div>

        {exportMode === 'internal' && commissionPreset !== 'none' && (
          <div className="ws-export-internal-extra">
            <div className="ws-export-totals-row">
              <span>Precio con Mercado Pago</span>
              <span style={{ fontWeight: 700 }}>{fmt(results.totalWithCommission)}</span>
            </div>
            <div className="ws-export-totals-row" style={{ fontSize: '0.75rem', color: '#888' }}>
              <span>Comisión efectiva: {pct(results.totalCommissionRate)}</span>
              <span>Recargo: {fmt(results.commissionAmount)}</span>
            </div>
          </div>
        )}

        {notes && (
          <div className="ws-export-notes">
            <span className="meta-label">OBSERVACIONES</span>
            <p>{notes}</p>
          </div>
        )}

        <div className="ws-export-footer">
          <div className="footer-thanks">¡Gracias por elegirnos! 🧉</div>
          <div className="footer-msg">Presupuesto válido por 7 días.<br />Cualquier consulta, escribinos.</div>
          <div className="footer-social">@condormates</div>
        </div>
      </div>
    </div>
  );
};

export default WholesaleBudget;
