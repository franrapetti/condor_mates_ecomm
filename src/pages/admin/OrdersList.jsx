import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import html2canvas from 'html2canvas';
import './OrdersList.css';

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Mercado Pago', 'Débito', 'Otro'];
const STATUS_OPTIONS = [
  { value: 'paid', label: 'Pagado ✅' },
  { value: 'debt', label: 'Me deben 💰' },
];
const EMPTY_FORM = {
  customer_name: '', customer_phone: '',
  payment_method: 'Efectivo', status: 'paid', notes: ''
};

const DISCOUNT_METHODS = ['Efectivo', 'Transferencia'];
const DISCOUNT_PERCENT = 10;

const generateTicket = (sale, discountInfo) => {
  const logoUrl = window.location.origin + '/logo.png';
  const date = new Date(sale.created_at);
  const formattedDate = date.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const formattedTime = date.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit'
  });
  const orderId = String(sale.id).slice(0, 8).toUpperCase();

  // Parse items
  let itemsHtml = '';
  let parsedItems = sale.items;
  // Try to parse JSON string (manual sales store items as JSON string)
  if (typeof parsedItems === 'string') {
    try {
      const parsed = JSON.parse(parsedItems);
      if (Array.isArray(parsed)) parsedItems = parsed;
    } catch (_) { /* not JSON, keep as string */ }
  }

  if (parsedItems && Array.isArray(parsedItems)) {
    // Structured items — array of {name, quantity, price}
    itemsHtml = parsedItems.map(item => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0ebe3; font-size: 14px; color: #3d3929;">
          <span style="font-weight: 600;">${item.name}</span>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0ebe3; text-align: center; font-size: 14px; color: #6b6455;">
          ${item.quantity}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0ebe3; text-align: right; font-size: 14px; font-weight: 600; color: #3d3929;">
          $${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>
    `).join('');
  } else if (typeof parsedItems === 'string') {
    // Legacy fallback — plain comma-separated string
    const raw = parsedItems || '';
    const lines = raw.split(',').map(s => s.trim()).filter(Boolean);
    itemsHtml = lines.map(line => `
      <tr>
        <td colspan="2" style="padding: 10px 0; border-bottom: 1px solid #f0ebe3; font-size: 14px; color: #3d3929; font-weight: 600;">
          ${line}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0ebe3; text-align: right; font-size: 14px; color: #6b6455;">
          —
        </td>
      </tr>
    `).join('');
  }

  const total = sale.total_price || sale.total_amount || sale.total || 0;
  const customerName = sale.customer_name || 'Cliente';

  // Discount display in ticket
  const hasDiscount = discountInfo && discountInfo.applied;
  const subtotalBeforeDiscount = hasDiscount ? discountInfo.subtotal : null;
  const discountPercent = hasDiscount ? discountInfo.percent : 0;
  const discountAmount = hasDiscount ? discountInfo.amount : 0;
  const discountMethod = hasDiscount ? discountInfo.method : '';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante Cóndor Mates - ${orderId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #f7f4ef;
      display: flex;
      justify-content: center;
      padding: 40px 20px;
      min-height: 100vh;
    }
    .ticket {
      background: #fffdf8;
      max-width: 420px;
      width: 100%;
      border-radius: 20px;
      box-shadow: 0 8px 40px rgba(61, 57, 41, 0.1), 0 1px 3px rgba(61, 57, 41, 0.06);
      overflow: hidden;
      position: relative;
    }
    .ticket::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 6px;
      background: linear-gradient(90deg, #234a2e, #3a7d44, #234a2e);
    }
    .ticket-header {
      text-align: center;
      padding: 36px 32px 24px;
      border-bottom: 2px dashed #e8e2d6;
    }
    .ticket-header img {
      height: 70px;
      margin-bottom: 12px;
      object-fit: contain;
    }
    .ticket-header .brand {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #234a2e;
      margin-top: 4px;
    }
    .ticket-header .tagline {
      font-size: 11px;
      color: #9c9585;
      margin-top: 4px;
      font-style: italic;
    }
    .ticket-meta {
      padding: 20px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f0ebe3;
    }
    .ticket-meta .label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #9c9585;
    }
    .ticket-meta .value {
      font-size: 13px;
      font-weight: 600;
      color: #3d3929;
      margin-top: 2px;
    }
    .ticket-customer {
      padding: 20px 32px;
      border-bottom: 1px solid #f0ebe3;
    }
    .ticket-customer .label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #9c9585;
      margin-bottom: 4px;
    }
    .ticket-customer .name {
      font-size: 16px;
      font-weight: 700;
      color: #234a2e;
    }
    .ticket-items {
      padding: 20px 32px;
    }
    .ticket-items .section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #9c9585;
      margin-bottom: 14px;
    }
    .ticket-items table {
      width: 100%;
      border-collapse: collapse;
    }
    .ticket-items th {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #b5ad9e;
      text-align: left;
      padding-bottom: 8px;
      border-bottom: 2px solid #f0ebe3;
    }
    .ticket-items th:nth-child(2) { text-align: center; }
    .ticket-items th:nth-child(3) { text-align: right; }
    .ticket-discount-area {
      padding: 16px 32px;
      border-top: 2px dashed #e8e2d6;
    }
    .ticket-discount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }
    .ticket-discount-row .dl {
      font-size: 12px;
      color: #9c9585;
      font-weight: 500;
    }
    .ticket-discount-row .dv {
      font-size: 13px;
      color: #3d3929;
      font-weight: 600;
    }
    .ticket-discount-row.discount .dl {
      color: #234a2e;
      font-weight: 600;
    }
    .ticket-discount-row.discount .dv {
      color: #234a2e;
      font-weight: 700;
    }
    .discount-badge {
      display: inline-block;
      background: linear-gradient(135deg, #234a2e, #3a7d44);
      color: white;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 10px;
      letter-spacing: 0.5px;
      margin-left: 6px;
      vertical-align: middle;
    }
    .ticket-total {
      padding: 16px 32px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ticket-total.no-discount {
      border-top: 2px dashed #e8e2d6;
      padding-top: 20px;
      padding-bottom: 28px;
    }
    .ticket-total .total-label {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b6455;
    }
    .ticket-total .total-value {
      font-size: 28px;
      font-weight: 800;
      color: #234a2e;
    }
    .ticket-footer {
      text-align: center;
      padding: 20px 32px 28px;
      background: linear-gradient(180deg, transparent, rgba(35, 74, 46, 0.03));
    }
    .ticket-footer .thanks {
      font-size: 15px;
      font-weight: 700;
      color: #234a2e;
      margin-bottom: 6px;
    }
    .ticket-footer .sub {
      font-size: 11px;
      color: #9c9585;
      line-height: 1.5;
    }
    .ticket-footer .ig {
      display: inline-block;
      margin-top: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #234a2e;
      text-decoration: none;
      padding: 6px 14px;
      border: 1.5px solid #234a2e;
      border-radius: 20px;
      transition: all 0.2s;
    }
    .no-print {
      text-align: center;
      margin-top: 24px;
      max-width: 420px;
      width: 100%;
    }
    .no-print button {
      padding: 12px 32px;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .no-print .btn-print {
      background: #234a2e;
      color: white;
      margin-right: 8px;
    }
    .no-print .btn-print:hover { background: #1a3822; transform: translateY(-1px); }
    .no-print .btn-close {
      background: #f0ebe3;
      color: #6b6455;
    }
    .no-print .btn-close:hover { background: #e8e2d6; }
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { background: #f7f4ef !important; padding: 20px; }
      .ticket {
        box-shadow: none;
        max-width: 100%;
        border-radius: 20px;
        background: #fffdf8 !important;
      }
      .ticket::before {
        background: linear-gradient(90deg, #234a2e, #3a7d44, #234a2e) !important;
        height: 6px !important;
        display: block !important;
      }
      .ticket-footer {
        background: linear-gradient(180deg, transparent, rgba(35, 74, 46, 0.03)) !important;
      }
      .discount-badge {
        background: linear-gradient(135deg, #234a2e, #3a7d44) !important;
        color: white !important;
      }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div style="display: flex; flex-direction: column; align-items: center;">
    <div class="ticket">
      <div class="ticket-header">
        <img src="${logoUrl}" alt="Cóndor Mates" />
        <div class="brand">Cóndor Mates</div>
        <div class="tagline">El arte de cebar</div>
      </div>
      <div class="ticket-meta">
        <div>
          <div class="label">Comprobante</div>
          <div class="value">#${orderId}</div>
        </div>
        <div style="text-align: right;">
          <div class="label">Fecha</div>
          <div class="value">${formattedDate}</div>
          <div class="value" style="font-size: 11px; color: #9c9585; font-weight: 500;">${formattedTime} hs</div>
        </div>
      </div>
      <div class="ticket-customer">
        <div class="label">Cliente</div>
        <div class="name">${customerName}</div>
      </div>
      <div class="ticket-items">
        <div class="section-title">Detalle del pedido</div>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>
      ${hasDiscount ? `
      <div class="ticket-discount-area">
        <div class="ticket-discount-row">
          <span class="dl">Subtotal</span>
          <span class="dv">$${subtotalBeforeDiscount.toLocaleString()}</span>
        </div>
        <div class="ticket-discount-row discount">
          <span class="dl">Desc. ${discountPercent}% ${discountMethod} <span class="discount-badge">${discountPercent}% OFF</span></span>
          <span class="dv">-$${discountAmount.toLocaleString()}</span>
        </div>
      </div>
      <div class="ticket-total">
        <span class="total-label">Total final</span>
        <span class="total-value">$${total.toLocaleString()}</span>
      </div>
      ` : `
      <div class="ticket-total no-discount">
        <span class="total-label">Total</span>
        <span class="total-value">$${total.toLocaleString()}</span>
      </div>
      `}
      <div class="ticket-footer">
        <div class="thanks">¡Gracias por tu compra! 🧉</div>
        <div class="sub">Esperamos que disfrutes tu pedido.<br/>Cualquier consulta, escribinos.</div>
        <a href="https://www.instagram.com/condor_mates" class="ig" target="_blank">@condor_mates</a>
      </div>
    </div>
    <div class="no-print">
      <button class="btn-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
      <button class="btn-close" onclick="window.close()">Cerrar</button>
    </div>
  </div>
</body>
</html>`;

  const ticketWindow = window.open('', '_blank', 'width=520,height=800');
  ticketWindow.document.write(html);
  ticketWindow.document.close();
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

  // Product autocomplete state
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [manualLines, setManualLines] = useState([]); // [{product_id, name, price, quantity}]
  const [productSearch, setProductSearch] = useState('');
  const [manualTotalOverride, setManualTotalOverride] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const searchInputRef = useRef(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Ticket modal state
  const [ticketModal, setTicketModal] = useState(null); // { sale, discountInfo }
  const [ticketCopied, setTicketCopied] = useState(false);
  const ticketRef = useRef(null);
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

      // Fetch product catalog for autocomplete
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, price, promo_price, stock, image_url, category')
        .order('name');
      if (prods) setCatalogProducts(prods);

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
    try {
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
      setAlerts(newAlerts);
    } catch (err) {
      console.error('Error fetching alerts', err);
    }
  };

  // --- Web Orders Mutations ---
  const updateOrderStatus = async (id, status) => {
    if (status === 'canceled') {
      if (!window.confirm('¿Estás seguro de que querés cancelar esta orden web? Esta acción no se puede deshacer.')) return;
    }
    try {
      const payload = { status };
      
      // Fix _combo ids for Postgres trigger compatibility
      const orderToUpdate = orders.find(o => o.id === id);
      if (orderToUpdate && orderToUpdate.items) {
        let parsedItems = orderToUpdate.items;
        if (typeof parsedItems === 'string') {
          try { parsedItems = JSON.parse(parsedItems); } catch (_) { parsedItems = null; }
        }
        if (Array.isArray(parsedItems)) {
          const needsFix = parsedItems.some(i => typeof i.id === 'string' && (i.id.includes('_combo') || i.id.startsWith('custom-')));
          if (needsFix) {
            payload.items = parsedItems.map(i => {
              if (typeof i.id === 'string') {
                if (i.id.includes('_combo')) return { ...i, id: parseInt(i.id.split('_')[0], 10) };
                if (i.id.startsWith('custom-')) return { ...i, id: 0 };
              }
              return i;
            });
          }
        }
      }

      const { error } = await supabase.from('orders').update(payload).eq('id', id);
      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status } : o));
      if (selectedOrder?.id === id) setSelectedOrder({ ...selectedOrder, status: status });
    } catch (error) {
      console.error(error);
      alert(`Error actualizando: ${error.message || JSON.stringify(error)}`);
    }
  };

  // --- Product Autocomplete Helpers ---
  const suggestions = productSearch.length >= 2
    ? catalogProducts.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const addProductLine = (product) => {
    setManualLines(prev => {
      const existing = prev.find(l => l.product_id === product.id);
      if (existing) {
        return prev.map(l => l.product_id === product.id ? { ...l, quantity: l.quantity + 1 } : l);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: product.promo_price || product.price,
        quantity: 1
      }];
    });
    setProductSearch('');
    setShowSuggestions(false);
    setManualTotalOverride(null);
  };

  const removeProductLine = (productId) => {
    setManualLines(prev => prev.filter(l => l.product_id !== productId));
    setManualTotalOverride(null);
  };

  const updateLineQuantity = (productId, delta) => {
    setManualLines(prev => prev.map(l => {
      if (l.product_id !== productId) return l;
      const newQty = Math.max(1, l.quantity + delta);
      return { ...l, quantity: newQty };
    }));
    setManualTotalOverride(null);
  };

  const updateCustomLine = (productId, field, value) => {
    setManualLines(prev => prev.map(l => {
      if (l.product_id !== productId) return l;
      return { ...l, [field]: value };
    }));
  };

  const addCustomItem = () => {
    setManualLines(prev => [...prev, {
      product_id: 'custom-' + Date.now(),
      name: 'Item personalizado',
      price: 0,
      quantity: 1,
      isCustom: true
    }]);
  };

  const calculatedTotal = manualLines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const hasAutoDiscount = DISCOUNT_METHODS.includes(manualForm.payment_method) && manualTotalOverride === null;
  const discountedTotal = hasAutoDiscount ? Math.round(calculatedTotal * (1 - DISCOUNT_PERCENT / 100)) : calculatedTotal;
  const effectiveTotal = manualTotalOverride !== null ? manualTotalOverride : discountedTotal;

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Manual Sales Mutations ---
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.customer_name.trim() || manualLines.length === 0) return;
    setSavingManual(true);
    
    try {
      const itemsJson = JSON.stringify(manualLines.map(l => ({ id: l.product_id, name: l.name, quantity: l.quantity, price: l.price })));
      const { error } = await supabase.from('manual_sales').insert([{
        ...manualForm,
        items: itemsJson,
        total_amount: effectiveTotal,
      }]);
      
      if (error) throw error;

      // Descontar stock inmediatamente (el producto ya fue entregado)
      for (const line of manualLines) {
        if (line.product_id && !String(line.product_id).startsWith('custom-')) {
          const productId = String(line.product_id).includes('_combo') ? parseInt(String(line.product_id).split('_')[0], 10) : line.product_id;
          
          const { data: dbProduct, error: stockError } = await supabase
            .from('products').select('stock').eq('id', productId).single();
            
          if (!stockError && dbProduct && dbProduct.stock !== null) {
            await supabase.from('products')
              .update({ stock: Math.max(0, dbProduct.stock - line.quantity) })
              .eq('id', productId);
          }
        }
      }
      
      setManualForm(EMPTY_FORM);
      setManualLines([]);
      setManualTotalOverride(null);
      setShowManualForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSavingManual(false);
    }
  };

  const handleDeleteManual = async (id) => {
    // Restaurar stock antes de eliminar
    const sale = manualSales.find(s => s.id === id);
    if (sale && sale.status !== 'cancelled') {
      try {
        const items = JSON.parse(sale.items);
        for (const item of items) {
          if (item.id) {
            const { data: dbProduct } = await supabase
              .from('products').select('stock').eq('id', item.id).single();
            if (dbProduct) {
              await supabase.from('products')
                .update({ stock: (dbProduct.stock || 0) + item.quantity })
                .eq('id', item.id);
            }
          }
        }
      } catch (_) { /* items legacy sin product_id, ignorar */ }
    }
    const { error } = await supabase.from('manual_sales').delete().eq('id', id);
    if (!error) {
      setManualSales(prev => prev.filter(s => s.id !== id));
      setDeleteConfirm(null);
      fetchData();
    }
  };

  const handleMarkManualPaid = async (id) => {
    const { error } = await supabase.from('manual_sales').update({ status: 'paid' }).eq('id', id);
    if (!error) setManualSales(prev => prev.map(s => s.id === id ? { ...s, status: 'paid' } : s));
  };

  const handleCancelManual = async (id) => {
    if (!window.confirm('¿Estás seguro de que querés cancelar esta venta manual? Se restaurará el stock de los productos y se marcará como cancelada.')) return;
    const sale = manualSales.find(s => s.id === id);
    if (!sale || sale.status === 'cancelled') return;
    // Restaurar stock
    try {
      const items = JSON.parse(sale.items);
      for (const item of items) {
        if (item.id) {
          const { data: dbProduct } = await supabase
            .from('products').select('stock').eq('id', item.id).single();
          if (dbProduct) {
            await supabase.from('products')
              .update({ stock: (dbProduct.stock || 0) + item.quantity })
              .eq('id', item.id);
          }
        }
      }
    } catch (_) { /* items legacy sin product_id */ }
    const { error } = await supabase.from('manual_sales').update({ status: 'cancelled' }).eq('id', id);
    if (!error) {
      setManualSales(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
      fetchData();
    }
  };

  // ── Ticket Modal & Sharing Helpers ──
  const openTicketModal = (sale, discountInfo = null) => {
    setTicketModal({ sale, discountInfo });
    setTicketCopied(false);
  };

  const getTicketTextSummary = (sale, discountInfo) => {
    const orderId = String(sale.id).slice(0, 8).toUpperCase();
    const date = new Date(sale.created_at);
    const formattedDate = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    const customerName = sale.customer_name || 'Cliente';
    const total = sale.total_price || sale.total_amount || sale.total || 0;

    let itemsList = '';
    let parsedItems = sale.items;
    if (typeof parsedItems === 'string') {
      try { parsedItems = JSON.parse(parsedItems); } catch (_) {}
    }
    if (Array.isArray(parsedItems)) {
      itemsList = parsedItems.map(i => `  • ${i.quantity}x ${i.name} — $${(i.price * i.quantity).toLocaleString()}`).join('\n');
    } else if (typeof parsedItems === 'string') {
      itemsList = parsedItems.split(',').map(s => `  • ${s.trim()}`).join('\n');
    }

    let discountText = '';
    if (discountInfo?.applied) {
      discountText = `\nSubtotal: $${discountInfo.subtotal.toLocaleString()}\nDesc. ${discountInfo.percent}% ${discountInfo.method}: -$${discountInfo.amount.toLocaleString()}`;
    }

    return `🧉 *CÓNDOR MATES*\nComprobante #${orderId}\n\n👤 *Cliente:* ${customerName}\n📅 *Fecha:* ${formattedDate}\n\n📦 *Pedido:*\n${itemsList}\n${discountText}\n💰 *Total: $${total.toLocaleString()}*\n\n¡Gracias por tu compra! 🧉\n🌐 condormates.com.ar\n📸 @condor_mates`;
  };

  const handleShareWhatsApp = () => {
    if (!ticketModal) return;
    const text = getTicketTextSummary(ticketModal.sale, ticketModal.discountInfo);
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleCopyTicket = async () => {
    if (!ticketModal) return;
    const text = getTicketTextSummary(ticketModal.sale, ticketModal.discountInfo);
    try {
      await navigator.clipboard.writeText(text);
      setTicketCopied(true);
      if (navigator.vibrate) navigator.vibrate(50);
      setTimeout(() => setTicketCopied(false), 2500);
    } catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setTicketCopied(true);
      setTimeout(() => setTicketCopied(false), 2500);
    }
  };

  const handleShareImage = async () => {
    if (!ticketRef.current) return;
    try {
      // Usamos un wrapper con fondo para la exportación y forzamos un ancho mayor
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.top = '-9999px';
      wrapper.style.left = '-9999px';
      wrapper.style.padding = '40px';
      wrapper.style.background = '#f7f4ef'; // Fondo similar al modal
      wrapper.style.display = 'flex';
      wrapper.style.justifyContent = 'center';
      wrapper.style.alignItems = 'center';

      const clone = ticketRef.current.cloneNode(true);
      clone.style.width = '480px'; // Un poco más ancho
      clone.style.maxWidth = 'none';
      clone.style.margin = '0';
      clone.style.position = 'relative';
      clone.style.transform = 'none';
      
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#f7f4ef',
        logging: false,
      });
      
      document.body.removeChild(wrapper);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'comprobante-condor-mates.png', { type: 'image/png' });
        const shareData = { files: [file], title: 'Comprobante Cóndor Mates' };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          if (navigator.vibrate) navigator.vibrate(50);
          return;
        }
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-${String(ticketModal.sale.id).slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating image:', err);
    }
  };

  const handlePrintTicket = () => {
    if (!ticketModal) return;
    generateTicket(ticketModal.sale, ticketModal.discountInfo);
  };

  const getStatusBadge = (status, isManual = false) => {
    if (isManual && status === 'debt') return <span className="status-badge pending" style={{background:'#fef3c7', color:'#d97706'}}>Me Debe</span>;
    if (isManual && status === 'cancelled') return <span className="status-badge canceled">Cancelado</span>;
    switch(status) {
      case 'paid': return <span className="status-badge paid">Pagado</span>;
      case 'pending':
      case 'pending_transfer': return <span className="status-badge pending">Pendiente (Transf.)</span>;
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
      items_desc: (() => {
        try {
          const parsed = JSON.parse(m.items);
          if (Array.isArray(parsed)) return parsed.map(l => `${l.quantity}x ${l.name}`).join(', ');
        } catch (_) {}
        return m.items;
      })(),
      total: m.total_amount || 0,
      status: m.status,
      payment_method: m.payment_method,
      source: 'manual',
      original: m
    }));

    return [...web, ...manual].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [orders, manualSales]);

  const filteredSales = unifiedSales.filter(s => {
    const matchesFilter = filter === 'all' || 
      (filter === 'pending' && (s.status === 'pending' || s.status === 'pending_transfer')) ||
      (filter !== 'pending' && s.status === filter) || 
      (filter === 'web' && s.type === 'web') || 
      (filter === 'manual' && s.type === 'manual');
    const searchLower = search.toLowerCase();
    const receiptId = String(s.id).slice(0, 8).toLowerCase();
    const matchesSearch = !search || 
      s.customer_name?.toLowerCase().includes(searchLower) ||
      s.customer_info?.toLowerCase().includes(searchLower) ||
      s.items_desc?.toLowerCase().includes(searchLower) ||
      receiptId.includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  // Calculate Basic KPIs (Unified)
  const getCutoff = () => {
    if (dateRange === 'all') return null;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  };
  
  const cutoff = getCutoff();
  
  const validWeb = orders.filter(o => {
    if (cutoff && new Date(o.created_at) < cutoff) return false;
    return o.status === 'paid' || o.status === 'shipped';
  });
  
  const validManual = manualSales.filter(s => {
    if (cutoff && new Date(s.created_at) < cutoff) return false;
    return s.status === 'paid';
  });
  
  const totalRevenue = validWeb.reduce((acc, o) => acc + o.total_price, 0) + validManual.reduce((acc, m) => acc + m.total_amount, 0);
  const totalSalesCount = validWeb.length + validManual.length;
  const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  
  const debtSales = manualSales.filter(s => {
    if (cutoff && new Date(s.created_at) < cutoff) return false;
    return s.status === 'debt';
  });
  const totalDebt = debtSales.reduce((acc, s) => acc + s.total_amount, 0);

  // Today Sales
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySales = unifiedSales.filter(s => new Date(s.created_at) >= today && s.status !== 'canceled' && s.status !== 'cancelled');
  const todaySalesCount = todaySales.length;
  const todayRevenue = todaySales.reduce((acc, s) => acc + (s.total || 0), 0);

  // Yerbas Sales Percentage
  let yerbaRevenue = 0;
  [...validWeb, ...validManual].forEach(sale => {
    let items = sale.original?.items || sale.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch (_) { items = []; }
    }
    if (Array.isArray(items)) {
      items.forEach(item => {
        const rawId = item.product_id || item.id;
        let numericId = null;
        if (rawId) {
          numericId = String(rawId).includes('_combo') ? parseInt(String(rawId).split('_')[0], 10) : Number(rawId);
        }
        
        const catProd = catalogProducts.find(p => Number(p.id) === numericId);
        const isYerba = catProd ? 
          (catProd.category === 'Yerbas' || catProd.category === 'Yerba Mate') : 
          /yerba|baldo|canarias|sara|rey verde/i.test(item.name || '');
          
        if (isYerba) {
          yerbaRevenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
        }
      });
    }
  });
  const yerbaPercentage = totalRevenue > 0 ? ((yerbaRevenue / totalRevenue) * 100).toFixed(1) : 0;

  // Calculate Advanced KPIs

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
          <form onSubmit={handleManualSubmit}>
            {/* Row 1: Cliente + Teléfono */}
            <div style={{display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1rem'}}>
              <input type="text" placeholder="Nombre del Cliente *" required value={manualForm.customer_name} onChange={e => setManualForm({...manualForm, customer_name: e.target.value})} className="orders-search-input" style={{marginLeft: 0}} />
              <input type="text" placeholder="Teléfono / WhatsApp" value={manualForm.customer_phone} onChange={e => setManualForm({...manualForm, customer_phone: e.target.value})} className="orders-search-input" style={{marginLeft: 0}} />
            </div>

            {/* Product Autocomplete */}
            <div style={{marginBottom: '1rem'}}>
              <label style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.5rem'}}>Productos del pedido *</label>
              <div style={{position: 'relative'}}>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="🔍 Escribí el nombre del producto..."
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => productSearch.length >= 2 && setShowSuggestions(true)}
                  className="orders-search-input"
                  style={{marginLeft: 0, width: '100%', boxSizing: 'border-box'}}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div ref={suggestionsRef} style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    maxHeight: 240, overflowY: 'auto', marginTop: 4
                  }}>
                    {suggestions.map(p => (
                      <div
                        key={p.id}
                        onClick={() => addProductLine(p)}
                        style={{
                          padding: '0.7rem 1rem', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.1s',
                          fontSize: '0.88rem',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(35, 74, 46, 0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{fontWeight: 600, color: 'var(--text-dark)'}}>{p.name}</span>
                        <span style={{
                          fontWeight: 700,
                          color: p.promo_price ? '#dc2626' : 'var(--accent)',
                          fontSize: '0.85rem',
                          whiteSpace: 'nowrap',
                          marginLeft: '1rem',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          ${(p.promo_price || p.price)?.toLocaleString()}
                          {p.stock === 0 && <span style={{marginLeft: 6, fontSize: '0.7rem', background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 4}}>Sin stock</span>}
                          {p.stock > 0 && p.stock <= 5 && <span style={{marginLeft: 6, fontSize: '0.7rem', background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 4}}>⚠️ {p.stock} disp.</span>}
                          {p.stock > 5 && <span style={{marginLeft: 6, fontSize: '0.7rem', background: '#dcfce7', color: '#16a34a', padding: '1px 6px', borderRadius: 4}}>{p.stock} disp.</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button 
                type="button" 
                onClick={addCustomItem}
                className="btn-secondary"
                style={{marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem'}}
              >
                + Agregar ítem personalizado
              </button>

              {/* Selected product lines */}
              {manualLines.length > 0 && (
                <div style={{marginTop: '0.75rem', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden'}}>
                  {manualLines.map(line => (
                    <div key={line.product_id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)',
                      fontSize: '0.88rem', gap: '0.5rem', flexWrap: 'wrap'
                    }}>
                      {line.isCustom ? (
                        <input 
                          type="text"
                          value={line.name}
                          onChange={e => updateCustomLine(line.product_id, 'name', e.target.value)}
                          className="orders-search-input"
                          style={{flex: 1, minWidth: '150px', margin: 0, padding: '0.3rem 0.5rem'}}
                          placeholder="Nombre del ítem"
                        />
                      ) : (
                        <span style={{fontWeight: 600, flex: 1, minWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{line.name}</span>
                      )}
                      
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap'}}>
                        {line.isCustom ? (
                          <div style={{display: 'flex', alignItems: 'center', gap: '0.2rem'}}>
                            <span style={{fontWeight: 600, color: 'var(--text-light)'}}>$</span>
                            <input 
                              type="number"
                              value={line.price}
                              onChange={e => updateCustomLine(line.product_id, 'price', Number(e.target.value))}
                              className="orders-search-input"
                              style={{width: '80px', margin: 0, padding: '0.3rem 0.5rem', textAlign: 'right'}}
                              min="0"
                            />
                          </div>
                        ) : null}

                        <div style={{display: 'flex', alignItems: 'center', gap: '0.3rem'}}>
                          <button type="button" onClick={() => updateLineQuantity(line.product_id, -1)}
                            style={{width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)'}}
                          >−</button>
                          <span style={{minWidth: 24, textAlign: 'center', fontWeight: 700}}>{line.quantity}</span>
                          <button type="button" onClick={() => updateLineQuantity(line.product_id, 1)}
                            style={{width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dark)'}}
                          >+</button>
                        </div>
                        <span style={{fontWeight: 700, color: 'var(--accent)', minWidth: 70, textAlign: 'right'}}>${(line.price * line.quantity).toLocaleString()}</span>
                        <button type="button" onClick={() => removeProductLine(line.product_id)}
                          style={{background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem', padding: '0 0.2rem'}}
                        >🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Row 2: Payment, Status, Total */}
            <div style={{display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1rem'}}>
              <select value={manualForm.payment_method} onChange={e => setManualForm({...manualForm, payment_method: e.target.value})} className="orders-search-input" style={{marginLeft: 0}}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={manualForm.status} onChange={e => setManualForm({...manualForm, status: e.target.value})} className="orders-search-input" style={{marginLeft: 0}}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap'}}>
                  <span style={{fontWeight: 800, fontSize: '1.15rem', color: manualLines.length > 0 ? 'var(--accent)' : 'var(--text-light)', whiteSpace: 'nowrap'}}>
                    💰 Total: ${effectiveTotal.toLocaleString()}
                  </span>
                  {hasAutoDiscount && calculatedTotal > 0 && (
                    <span style={{
                      background: 'linear-gradient(135deg, #234a2e, #3a7d44)', color: 'white',
                      fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px',
                      borderRadius: 10, letterSpacing: '0.03em', whiteSpace: 'nowrap'
                    }}>
                      {DISCOUNT_PERCENT}% OFF {manualForm.payment_method}
                    </span>
                  )}
                  {manualTotalOverride !== null && (
                    <button type="button" onClick={() => setManualTotalOverride(null)}
                      style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280', textDecoration: 'underline'}}
                    >Resetear</button>
                  )}
                </div>
                {hasAutoDiscount && calculatedTotal > 0 && (
                  <span style={{fontSize: '0.75rem', color: '#6b7280'}}>
                    Sin desc: <span style={{textDecoration: 'line-through'}}>${calculatedTotal.toLocaleString()}</span>
                    {' '}→{' '}Ahorro: ${(calculatedTotal - effectiveTotal).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Override total + Notes */}
            <div style={{display: 'grid', gap: '1rem', gridTemplateColumns: '160px 1fr', marginBottom: '1rem'}}>
              <input
                type="number"
                placeholder="Override total"
                min="0"
                value={manualTotalOverride ?? ''}
                onChange={e => setManualTotalOverride(e.target.value === '' ? null : Number(e.target.value))}
                className="orders-search-input"
                style={{marginLeft: 0, fontSize: '0.82rem'}}
              />
              <input type="text" placeholder="Notas opcionales" value={manualForm.notes} onChange={e => setManualForm({...manualForm, notes: e.target.value})} className="orders-search-input" style={{marginLeft: 0}} />
            </div>

            <button type="submit" className="btn-primary" disabled={savingManual || manualLines.length === 0} style={{maxWidth: 220}}>
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
        <div className="kpi-card" style={{background: 'linear-gradient(135deg, rgba(46, 166, 85, 0.1), rgba(46, 166, 85, 0.02))', borderColor: 'rgba(46, 166, 85, 0.2)'}}>
          <h3 style={{color: 'var(--accent)'}}>Ventas Hoy</h3>
          <p className="kpi-value" style={{color: 'var(--accent)'}}>{todaySalesCount} <span style={{fontSize: '1rem', fontWeight: 600, opacity: 0.8}}>(${todayRevenue.toLocaleString()})</span></p>
        </div>
        <div className="kpi-card">
          <h3>Ingresos Totales</h3>
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
        <div className="kpi-card" style={{background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.05), rgba(217, 119, 6, 0.01))', borderColor: 'rgba(217, 119, 6, 0.2)'}}>
          <h3 style={{color: '#b45309'}}>Proporción Yerbas</h3>
          <p className="kpi-value" style={{color: '#d97706', fontSize: '1.25rem'}}>{yerbaPercentage}% <span style={{fontSize: '0.85rem', fontWeight: 600, opacity: 0.8}}>del ingreso</span></p>
          <p style={{fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.2rem', lineHeight: 1.3}}>
            <strong>Margen prom:</strong> ~23% (30% sobre costo)
          </p>
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
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="search"
              placeholder="🔍 Buscar por nombre, items o info..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="orders-search-input"
              style={{ flex: 1 }}
            />
            <button 
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
              title="Actualizar datos"
              className="btn-secondary"
              style={{ padding: '0.5rem 0.75rem' }}
            >
              🔄
            </button>
          </div>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todas</button>
          <button className={filter === 'web' ? 'active' : ''} onClick={() => setFilter('web')}>Web</button>
          <button className={filter === 'manual' ? 'active' : ''} onClick={() => setFilter('manual')}>Manuales</button>
          <button className={filter === 'paid' ? 'active' : ''} onClick={() => setFilter('paid')}>Solo Pagadas</button>
          <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Web Pendientes</button>
          <button className={filter === 'debt' ? 'active' : ''} onClick={() => setFilter('debt')}>Deudores (Manual)</button>
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
                    <td data-label="Fecha">{new Date(sale.created_at).toLocaleDateString('es-AR', {day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'})}</td>
                    <td data-label="Origen">
                      {sale.type === 'web' ? <span style={{background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold'}}>🌐 Web</span> 
                                           : <span style={{background: '#e5e7eb', color: '#374151', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold'}}>📝 Manual</span>}
                    </td>
                    <td data-label="Cliente">
                      <div style={{fontWeight: 600}}>{sale.customer_name}</div>
                      {sale.customer_info && <div style={{fontSize: '0.75rem', color: '#6b7280'}}>{sale.customer_info}</div>}
                    </td>
                    <td data-label="Items" className="orders-td-items" style={{maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem'}} title={sale.items_desc}>
                      {sale.items_desc}
                    </td>
                    <td data-label="Estado">{getStatusBadge(sale.status, sale.type === 'manual')}</td>
                    <td data-label="Total" style={{fontWeight: 600, color: sale.status === 'debt' ? '#d97706' : 'var(--accent)'}}>${sale.total.toLocaleString()}</td>
                    <td data-label="Acción">
                      <div style={{display: 'flex', gap: '0.4rem', flexWrap: 'wrap'}}>
                        {sale.type === 'web' && (
                          <button className="btn-view" onClick={() => setSelectedOrder(sale.original)} style={{padding: '0.3rem 0.6rem'}}>VER</button>
                        )}
                        <button
                          onClick={() => {
                            const orig = sale.original;
                            const pm = sale.payment_method;
                            let calculatedSubtotal = 0;
                            try {
                              const items = typeof orig.items === 'string' ? JSON.parse(orig.items) : orig.items;
                              if (Array.isArray(items)) {
                                calculatedSubtotal = items.reduce((acc, i) => acc + ((i.price || 0) * (i.quantity || 1)), 0);
                              }
                            } catch (_) {}
                            
                            if (!calculatedSubtotal && sale.type === 'manual') {
                              calculatedSubtotal = Math.round(sale.total / (1 - DISCOUNT_PERCENT / 100));
                            }

                            const isManualDiscount = sale.type === 'manual' && DISCOUNT_METHODS.includes(pm) && calculatedSubtotal > sale.total;
                            const discountInfo = isManualDiscount ? {
                              applied: true,
                              subtotal: calculatedSubtotal,
                              percent: DISCOUNT_PERCENT,
                              amount: calculatedSubtotal - sale.total,
                              method: pm
                            } : null;
                            openTicketModal(orig, discountInfo);
                          }}
                          title="Emitir Comprobante"
                          style={{background: 'linear-gradient(135deg, #234a2e, #3a7d44)', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', transition: 'opacity 0.15s'}}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >🧾</button>
                        {sale.type === 'web' && (sale.status === 'pending' || sale.status === 'pending_transfer') && (
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
                        {sale.type === 'manual' && sale.status !== 'cancelled' && (
                          <button onClick={() => handleCancelManual(sale.id)} style={{background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'}}>
                            ✕ Cancelar
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
                <button
                  onClick={() => openTicketModal(selectedOrder, null)}
                  style={{
                    background: 'linear-gradient(135deg, #234a2e, #3a7d44)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    padding: '0.75rem 1.2rem', cursor: 'pointer', fontWeight: 700,
                    fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                    boxShadow: '0 2px 8px rgba(35,74,46,0.25)',
                    transition: 'transform 0.15s, box-shadow 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(35,74,46,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(35,74,46,0.25)'; }}
                >
                  🧾 Emitir Comprobante
                </button>
                {selectedOrder.status === 'paid' && (
                  <button className="btn-primary" onClick={() => updateOrderStatus(selectedOrder.id, 'shipped')}>
                    📦 Marcar Enviado
                  </button>
                )}
                {(selectedOrder.status === 'pending' || selectedOrder.status === 'pending_transfer') && (
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

      {/* Ticket Modal */}
      {ticketModal && (
        <div className="order-modal-overlay" onClick={() => setTicketModal(null)}>
          <div className="order-modal-content ticket-modal-content" onClick={e => e.stopPropagation()}>
            <div className="order-modal-header">
              <h2>Comprobante de Venta</h2>
              <button className="close-btn" onClick={() => setTicketModal(null)}>×</button>
            </div>
            
            <div className="order-modal-body" style={{ background: '#f7f4ef', display: 'flex', justifyContent: 'center' }}>
              {/* Ticket Render Area for html2canvas */}
              <div 
                ref={ticketRef}
                style={{
                  background: '#fffdf8',
                  maxWidth: '100%',
                  width: '380px',
                  borderRadius: '20px',
                  boxShadow: '0 8px 40px rgba(61, 57, 41, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  margin: '1rem 0'
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
                  background: 'linear-gradient(90deg, #234a2e, #3a7d44, #234a2e)'
                }} />
                
                <div style={{ textAlign: 'center', padding: '36px 32px 24px', borderBottom: '2px dashed #e8e2d6' }}>
                  <img src="/logo.png" alt="Cóndor Mates" style={{ height: '70px', width: 'auto', display: 'inline-block', marginBottom: '12px', objectFit: 'contain' }} />
                  <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: '#234a2e' }}>Cóndor Mates</div>
                  <div style={{ fontSize: '11px', color: '#9c9585', fontStyle: 'italic', marginTop: '4px' }}>El arte de cebar</div>
                </div>

                <div style={{ padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0ebe3' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#9c9585' }}>Comprobante</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#3d3929', marginTop: '2px' }}>#{String(ticketModal.sale.id).slice(0, 8).toUpperCase()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#9c9585' }}>Fecha</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#3d3929', marginTop: '2px' }}>
                      {new Date(ticketModal.sale.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '20px 32px', borderBottom: '1px solid #f0ebe3' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#9c9585', marginBottom: '4px' }}>Cliente</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#234a2e' }}>{ticketModal.sale.customer_name || 'Cliente'}</div>
                </div>

                <div style={{ padding: '20px 32px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#9c9585', marginBottom: '14px' }}>Detalle del pedido</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b5ad9e', textAlign: 'left', paddingBottom: '8px', borderBottom: '2px solid #f0ebe3' }}>Producto</th>
                        <th style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b5ad9e', textAlign: 'center', paddingBottom: '8px', borderBottom: '2px solid #f0ebe3' }}>Cant.</th>
                        <th style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#b5ad9e', textAlign: 'right', paddingBottom: '8px', borderBottom: '2px solid #f0ebe3' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let parsedItems = ticketModal.sale.items;
                        if (typeof parsedItems === 'string') {
                          try { parsedItems = JSON.parse(parsedItems); } catch (_) {}
                        }
                        if (Array.isArray(parsedItems)) {
                          return parsedItems.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '10px 0', borderBottom: '1px solid #f0ebe3', fontSize: '14px', color: '#3d3929', fontWeight: 600 }}>{item.name}</td>
                              <td style={{ padding: '10px 0', borderBottom: '1px solid #f0ebe3', textAlign: 'center', fontSize: '14px', color: '#6b6455' }}>{item.quantity}</td>
                              <td style={{ padding: '10px 0', borderBottom: '1px solid #f0ebe3', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#3d3929' }}>${((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
                            </tr>
                          ));
                        } else if (typeof parsedItems === 'string') {
                          return parsedItems.split(',').map((line, idx) => (
                            <tr key={idx}>
                              <td colSpan="2" style={{ padding: '10px 0', borderBottom: '1px solid #f0ebe3', fontSize: '14px', color: '#3d3929', fontWeight: 600 }}>{line.trim()}</td>
                              <td style={{ padding: '10px 0', borderBottom: '1px solid #f0ebe3', textAlign: 'right', fontSize: '14px', color: '#6b6455' }}>—</td>
                            </tr>
                          ));
                        }
                        return null;
                      })()}
                    </tbody>
                  </table>
                </div>

                {ticketModal.discountInfo && ticketModal.discountInfo.applied ? (
                  <>
                    <div style={{ padding: '16px 32px', borderTop: '2px dashed #e8e2d6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', color: '#9c9585', fontWeight: 500 }}>
                        <span>Subtotal</span>
                        <span style={{ fontSize: '13px', color: '#3d3929', fontWeight: 600 }}>${ticketModal.discountInfo.subtotal.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#234a2e', fontWeight: 600 }}>
                        <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                          Desc. {ticketModal.discountInfo.percent}% {ticketModal.discountInfo.method}
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, background: 'linear-gradient(135deg, #234a2e, #3a7d44)', color: 'white', fontSize: '9px', fontWeight: 800, padding: '3px 8px 2px', borderRadius: '10px', marginLeft: '6px' }}>
                            {ticketModal.discountInfo.percent}% OFF
                          </span>
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>-${ticketModal.discountInfo.amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={{ padding: '16px 32px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#6b6455' }}>Total final</span>
                      <span style={{ fontSize: '28px', fontWeight: 800, color: '#234a2e' }}>${(ticketModal.sale.total_price || ticketModal.sale.total_amount || ticketModal.sale.total || 0).toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px 32px 28px', borderTop: '2px dashed #e8e2d6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#6b6455' }}>Total</span>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: '#234a2e' }}>${(ticketModal.sale.total_price || ticketModal.sale.total_amount || ticketModal.sale.total || 0).toLocaleString()}</span>
                  </div>
                )}

                <div style={{ textAlign: 'center', padding: '20px 32px 28px', background: 'linear-gradient(180deg, transparent, rgba(35, 74, 46, 0.03))' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#234a2e', marginBottom: '6px' }}>¡Gracias por tu compra! 🧉</div>
                  <div style={{ fontSize: '11px', color: '#9c9585', lineHeight: 1.5 }}>Esperamos que disfrutes tu pedido.<br/>Cualquier consulta, escribinos.</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: '12px', fontSize: '12px', fontWeight: 600, color: '#234a2e', padding: '7px 14px 6px', border: '1.5px solid #234a2e', borderRadius: '20px', lineHeight: 1 }}>
                    @condor_mates
                  </div>
                </div>
              </div>
            </div>

            <div className="order-modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={handleShareWhatsApp} style={{ flex: 1, minWidth: '140px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', padding: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  💬 Enviar WhatsApp
                </button>
                <button onClick={handleShareImage} style={{ flex: 1, minWidth: '140px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  📤 Compartir Imagen
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={handleCopyTicket} style={{ flex: 1, minWidth: '140px', background: 'var(--surface)', color: 'var(--text-dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {ticketCopied ? '✅ Copiado' : '📋 Copiar Resumen'}
                </button>
                <button onClick={handlePrintTicket} style={{ flex: 1, minWidth: '140px', background: 'var(--surface)', color: 'var(--text-dark)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  🖨 Imprimir
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
