import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Package, ChevronRight, Check, X } from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'Mates',    label: 'Mates',     emoji: '🧉', max: 1 },
  { key: 'Bombillas', label: 'Bombillas', emoji: '🪗', max: 1 },
  { key: 'Termos',   label: 'Termos',    emoji: '♨️',  max: 1 },
  { key: 'Yerbas',   label: 'Yerbas',    emoji: '🌿', max: 1 },
  { key: 'Materas',  label: 'Materas',   emoji: '🧺', max: 1 },
];

const DISCOUNT_TIERS = [
  { min: 1, max: 1, pct: 0,  label: 'Precio base',    color: 'bg-bone-200' },
  { min: 2, max: 2, pct: 5,  label: '5% de descuento', color: 'bg-green-200' },
  { min: 3, max: 3, pct: 8,  label: '8% de descuento', color: 'bg-green-400' },
  { min: 4, max: 99, pct: 14, label: '14% de descuento', color: 'bg-forest-600' },
];

const STEP_LABELS = [
  'Elegí tu mate',
  'Elegí tu bombilla',
  'Tiempo de Packaging',
];

// ─── PACKAGING ALGORITHM ──────────────────────────────────────────────────────
function resolvePackaging(selected) {
  const cats = Object.keys(selected).filter(k => selected[k]);
  const has = (c) => cats.includes(c);

  if (has('Materas')) {
    return { options: [], disabled: true, reason: 'Las materas ya incluyen su packaging especial 🧺' };
  }
  if (has('Mates') && !has('Bombillas') && !has('Yerbas') && !has('Termos') && !has('Materas')) {
    return { options: ['Caja de Mate'], disabled: false };
  }
  if (has('Mates') && has('Bombillas') && has('Yerbas') && !has('Termos') && !has('Materas')) {
    return { options: ['Caja de Mate'], disabled: false };
  }
  if (has('Bombillas') && !has('Mates') && !has('Yerbas') && !has('Termos') && !has('Materas')) {
    return { options: ['Caja de Bombilla'], disabled: false };
  }
  if (has('Yerbas') && has('Bombillas') && !has('Mates') && !has('Termos') && !has('Materas')) {
    return { options: ['Bolsa de Tela Personalizada'], disabled: false };
  }
  if (cats.length > 0) {
    return { options: ['Caja Estándar'], disabled: false };
  }
  return { options: [], disabled: false };
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product, selected, onToggle }) {
  const [pressed, setPressed] = useState(false);
  const isSelected = selected;

  const handleClick = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    onToggle(product);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative text-left w-full rounded-xl border-2 overflow-hidden
        transition-all duration-150 cursor-pointer group
        ${pressed ? 'scale-95' : 'scale-100'}
        ${isSelected
          ? 'border-forest-700 ring-2 ring-forest-400 ring-offset-1 shadow-md'
          : 'border-bone-200 hover:border-forest-600 hover:shadow-sm'
        }
      `}
      style={{ background: isSelected ? 'rgba(35,74,46,0.05)' : 'white' }}
    >
      {/* Selected check */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-forest-700 flex items-center justify-center shadow">
          <Check size={11} color="white" strokeWidth={3} />
        </div>
      )}

      {/* Image */}
      <div className="aspect-square w-full overflow-hidden bg-bone-100">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{product.name}</p>
        <p className="text-xs font-bold text-forest-700 mt-1">
          ${(product.promo_price || product.price).toLocaleString()}
        </p>
      </div>
    </button>
  );
}

// ─── VISUAL BOX (LEFT PANEL) ──────────────────────────────────────────────────
function VisualBox({ selections, discount, subtotal, finalPrice, itemCount }) {
  const items = Object.values(selections).filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-bone-200 shadow-sm p-5 flex flex-col gap-4 h-full">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Tu combo</h3>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-bone-100 flex items-center justify-center mb-3">
              <ShoppingBag size={22} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Seleccioná productos<br/>para armar tu combo</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-bone-50 rounded-xl p-2.5 border border-bone-200">
                <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-bone-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-forest-700 font-bold">${(p.promo_price || p.price).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {itemCount > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{itemCount} {itemCount === 1 ? 'producto' : 'productos'}</span>
            <span className="font-bold text-forest-700">
              {discount > 0 ? `${discount}% OFF` : 'Agregá más para descontar'}
            </span>
          </div>
          <div className="w-full bg-bone-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((itemCount / 4) * 100, 100)}%`,
                background: 'linear-gradient(90deg, #234A2E, #4ae577)',
              }}
            />
          </div>
          <div className="flex gap-1 mt-1.5">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="flex-1 text-center">
                <div className={`text-[10px] font-bold ${itemCount >= n ? 'text-forest-700' : 'text-gray-300'}`}>
                  {n === 1 ? '–' : n === 2 ? '5%' : n === 3 ? '8%' : '14%'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing */}
      {itemCount > 0 && (
        <div className="border-t border-bone-200 pt-4">
          {discount > 0 && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400 line-through">${subtotal.toLocaleString()}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">−{discount}%</span>
            </div>
          )}
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-gray-600">Total</span>
            <span className="text-2xl font-black text-forest-800">${finalPrice.toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">💸 ${Math.round(finalPrice * 0.9).toLocaleString()} con transferencia</p>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ComboBuilder() {
  const [products, setProducts] = useState({});       // { 'Mates': [...], ... }
  const [loadingCats, setLoadingCats] = useState(true);
  const [selections, setSelections] = useState({});   // { 'Mates': product|null, ... }
  const [packaging, setPackaging] = useState(null);   // selected packaging string
  const [activeStep, setActiveStep] = useState(0);    // 0=picking, 1=packaging, 2=done
  const { addToCart, setIsCartOpen } = useCart();
  const rightPanelRef = useRef(null);

  // ── Fetch products ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setLoadingCats(true);
      try {
        const { data } = await supabase
          .from('products')
          .select('id, name, price, promo_price, image_url, category, sub_category, stock')
          .in('category', CATEGORIES.map(c => c.key))
          .gt('stock', 0)
          .order('sold_count', { ascending: false });

        const grouped = {};
        CATEGORIES.forEach(c => { grouped[c.key] = []; });
        (data || []).forEach(p => {
          if (grouped[p.category]) grouped[p.category].push(p);
        });
        setProducts(grouped);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchAll();
  }, []);

  // ── Derived state ───────────────────────────────────────────────────────────
  const selectedItems = useMemo(
    () => Object.values(selections).filter(Boolean),
    [selections]
  );

  const itemCount = selectedItems.length;

  const discount = useMemo(() => {
    const tier = DISCOUNT_TIERS.slice().reverse().find(t => itemCount >= t.min);
    return tier ? tier.pct : 0;
  }, [itemCount]);

  const subtotal = useMemo(
    () => selectedItems.reduce((sum, p) => sum + (p.promo_price || p.price), 0),
    [selectedItems]
  );

  const finalPrice = useMemo(
    () => Math.round(subtotal * (1 - discount / 100)),
    [subtotal, discount]
  );

  const packagingResult = useMemo(() => {
    const catMap = {};
    CATEGORIES.forEach(c => { catMap[c.key] = !!selections[c.key]; });
    return resolvePackaging(catMap);
  }, [selections]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToggle = (cat, product) => {
    setSelections(prev => ({
      ...prev,
      [cat]: prev[cat]?.id === product.id ? null : product,
    }));
    setPackaging(null);
  };

  const handleAddToCart = () => {
    selectedItems.forEach(p => addToCart(p));
    setIsCartOpen(true);
  };

  const hasSelections = itemCount > 0;
  const showPackagingStep = hasSelections && packagingResult.options.length > 0;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bone-100" style={{ background: '#F4F0E8' }}>

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-forest-700 bg-green-100 px-3 py-1 rounded-full">
            ✨ Configurador
          </span>
          <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Armá tu Combo
          </h1>
          <p className="mt-1.5 text-base text-gray-500 max-w-xl">
            Elegí tus productos y desbloqueá hasta un <strong className="text-forest-700">14% de descuento</strong> automático.
          </p>
        </div>

        {/* ── Discount tier badges ───────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-8">
          {DISCOUNT_TIERS.map((t, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${
                (i === 0 && itemCount <= 1) ||
                (i === 1 && itemCount === 2) ||
                (i === 2 && itemCount === 3) ||
                (i === 3 && itemCount >= 4)
                  ? 'bg-forest-700 text-white border-forest-700 shadow-md scale-105'
                  : 'bg-white text-gray-400 border-bone-200'
              }`}
            >
              <span>{i + 1}{i === 3 ? '+' : ''} producto{i > 0 ? 's' : ''}</span>
              <span>{t.pct > 0 ? `→ ${t.pct}% OFF` : '→ sin descuento'}</span>
            </div>
          ))}
        </div>

        {/* ── Main Layout ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

          {/* LEFT: Sticky visual box (desktop only) */}
          <div className="hidden lg:block sticky top-6">
            <VisualBox
              selections={selections}
              discount={discount}
              subtotal={subtotal}
              finalPrice={finalPrice}
              itemCount={itemCount}
            />
            {hasSelections && (
              <button
                onClick={handleAddToCart}
                className="mt-3 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-150 hover:scale-[1.02] hover:shadow-lg active:scale-95"
                style={{ background: 'linear-gradient(135deg, #234A2E 0%, #3d8055 100%)', boxShadow: '0 4px 16px rgba(35,74,46,0.3)' }}
              >
                Agregar combo al carrito 🛒
              </button>
            )}
          </div>

          {/* RIGHT: Scrollable selection panel */}
          <div ref={rightPanelRef} className="flex flex-col gap-5">

            {/* ── Product categories ─────────────────────────────────────── */}
            {CATEGORIES.map((cat) => {
              const catProducts = products[cat.key] || [];
              const selected = selections[cat.key];

              return (
                <div key={cat.key} className="bg-white rounded-2xl border border-bone-200 shadow-sm overflow-hidden">
                  {/* Category header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-bone-100">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{cat.emoji}</span>
                      <div>
                        <h2 className="font-bold text-gray-800 text-sm">{cat.label}</h2>
                        {selected && (
                          <p className="text-xs text-forest-700 font-medium">{selected.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected && (
                        <button
                          onClick={() => handleToggle(cat.key, selected)}
                          className="text-xs text-gray-400 hover:text-red-500 border border-bone-200 rounded-lg px-2 py-1 transition-colors flex items-center gap-1"
                        >
                          <X size={11} /> Quitar
                        </button>
                      )}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected ? 'bg-forest-700 border-forest-700' : 'border-bone-200'}`}>
                        {selected && <Check size={11} color="white" strokeWidth={3} />}
                      </div>
                    </div>
                  </div>

                  {/* Product grid */}
                  <div className="p-4">
                    {loadingCats ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className="rounded-xl bg-bone-100 aspect-square animate-pulse" />
                        ))}
                      </div>
                    ) : catProducts.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No hay productos disponibles en esta categoría.</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {catProducts.map(p => (
                          <ProductCard
                            key={p.id}
                            product={p}
                            selected={selected?.id === p.id}
                            onToggle={(product) => handleToggle(cat.key, product)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* ── Packaging section ──────────────────────────────────────── */}
            {hasSelections && (
              <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all duration-500 ${packagingResult.disabled ? 'border-bone-100 opacity-60' : 'border-bone-200'}`}>
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-bone-100">
                  <Package size={18} className="text-forest-700" />
                  <div>
                    <h2 className="font-bold text-gray-800 text-sm">Packaging</h2>
                    <p className="text-xs text-gray-400">
                      {packagingResult.disabled
                        ? packagingResult.reason
                        : 'Elegí cómo vas a recibir tu combo'}
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  {packagingResult.disabled ? (
                    <div className="text-center py-4 text-sm text-gray-400">
                      {packagingResult.reason}
                    </div>
                  ) : packagingResult.options.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">Seleccioná productos para ver las opciones de packaging.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {packagingResult.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setPackaging(opt)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150 ${
                            packaging === opt
                              ? 'border-forest-700 bg-forest-700 text-white shadow-md'
                              : 'border-bone-200 bg-white text-gray-700 hover:border-forest-600'
                          }`}
                        >
                          📦 {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY BOTTOM BAR ─────────────────────────────────────────── */}
      {hasSelections && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-bone-200 px-4 py-3 shadow-2xl">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{itemCount} producto{itemCount > 1 ? 's' : ''}</span>
                  {discount > 0 && (
                    <span className="text-xs font-bold text-white bg-forest-700 px-2 py-0.5 rounded-full">−{discount}%</span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  {discount > 0 && (
                    <span className="text-xs text-gray-400 line-through">${subtotal.toLocaleString()}</span>
                  )}
                  <span className="text-xl font-black text-forest-800">${finalPrice.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={handleAddToCart}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #234A2E 0%, #3d8055 100%)', boxShadow: '0 4px 12px rgba(35,74,46,0.35)' }}
              >
                <ShoppingBag size={16} />
                Agregar al carrito
              </button>
            </div>

            {/* Mini progress bar (mobile) */}
            <div className="w-full bg-bone-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((itemCount / 4) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #234A2E, #4ae577)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Spacer for mobile bottom bar */}
      <div className="lg:hidden h-24" />
    </div>
  );
}
