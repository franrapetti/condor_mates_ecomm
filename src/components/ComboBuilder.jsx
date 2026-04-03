import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Package, ChevronLeft, Check, X, ArrowRight } from 'lucide-react';
import './ComboBuilder.css';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'Mates',    label: 'Mates',     emoji: '🧉', max: 1 },
  { key: 'Bombillas', label: 'Bombillas', emoji: '🪗', max: 1 },
  { key: 'Termos',   label: 'Termos',    emoji: '♨️',  max: 1 },
  { key: 'Yerbas',   label: 'Yerbas',    emoji: '🌿', max: 1 },
  { key: 'Materas',  label: 'Materas',   emoji: '🧺', max: 1 },
];

const DISCOUNT_TIERS = [
  { min: 1, max: 1, pct: 0,  label: 'Precio base',    color: 'bg-bone-300' },
  { min: 2, max: 2, pct: 5,  label: '5% de descuento', color: 'bg-green-100' },
  { min: 3, max: 3, pct: 8,  label: '8% de descuento', color: 'bg-green-200' },
  { min: 4, max: 99, pct: 14, label: '14% de descuento', color: 'bg-forest-700' },
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

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function CategoryCard({ cat, selected, onClick }) {
  const hasSelection = !!selected;
  return (
    <div 
      className={`category-card ${hasSelection ? 'has-selection' : ''}`} 
      onClick={() => onClick(cat.key)}
    >
      {hasSelection && (
        <div className="category-card-image-bg">
          <img src={selected.image_url} alt={selected.name} />
          <div className="category-card-overlay" />
        </div>
      )}
      {!hasSelection && <span className="category-card-icon">{cat.emoji}</span>}
      <span className="category-card-label">{cat.label}</span>
      {hasSelection && (
        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg">
          <Check size={14} className="text-forest-700" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, selected, onToggle }) {
  const isSelected = !!selected;
  const handleClick = () => {
    // Analytics tracking
    supabase.rpc('increment_click_count', { product_id: product.id }).catch(() => {});
    onToggle(product);
  };

  return (
    <button
      onClick={handleClick}
      className={`relative text-left w-full rounded-2xl border-2 overflow-hidden transition-all duration-200 group bg-white ${isSelected ? 'border-[var(--forest-dark)] ring-1 ring-[var(--forest-dark)]' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}`}
    >
      <div className="aspect-[4/5] w-full overflow-hidden bg-gray-50">
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
      </div>
      <div className="p-3">
        <p className="text-[0.8rem] font-bold text-gray-800 line-clamp-1">{product.name}</p>
        <p className="text-[0.85rem] font-black text-[var(--forest-dark)] mt-0.5">${(product.promo_price || product.price).toLocaleString()}</p>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 bg-[var(--forest-dark)] text-white w-5 h-5 rounded-full flex items-center justify-center">
          <Check size={12} strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

function VisualBox({ selections, discount, subtotal, finalPrice, itemCount, onAddToCart }) {
  const items = Object.values(selections).filter(Boolean);
  return (
    <div className="bg-white rounded-2xl border border-bone-300 shadow-xl p-6 flex flex-col gap-5 sticky top-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Resumen del Combo</h3>
      
      <div className="flex flex-col gap-2.5">
        {items.length === 0 ? (
          <div className="py-6 text-center">
             <ShoppingBag size={24} className="mx-auto text-gray-200 mb-2" />
             <p className="text-sm text-gray-400 font-medium">No hay productos aún</p>
          </div>
        ) : (
          items.map(p => (
            <div key={p.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
               <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded-lg" />
               <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs font-bold text-[var(--forest-dark)]">${(p.promo_price || p.price).toLocaleString()}</p>
               </div>
            </div>
          ))
        )}
      </div>

      {itemCount > 0 && (
        <div className="pt-2">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[0.7rem] font-bold text-gray-400">{itemCount} PRODUCTOS</span>
            <span className="text-[0.7rem] font-black text-[var(--forest-dark)] bg-green-50 px-2.5 py-1 rounded-full">{discount > 0 ? `${discount}% OFF ACTIVADO` : 'SUMÁ PARA DESCUENTO'}</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--forest-dark)] transition-all duration-700" style={{ width: `${(itemCount / 4) * 100}%` }} />
          </div>
        </div>
      )}

      {itemCount > 0 && (
        <div className="border-t border-dashed border-gray-200 pt-5">
           {discount > 0 && (
             <div className="flex justify-between text-sm mb-1 opacity-60">
                <span className="line-through text-gray-400">${subtotal.toLocaleString()}</span>
                <span className="font-bold text-green-600">-{discount}%</span>
             </div>
           )}
           <div className="flex justify-between items-end mb-4">
              <span className="text-sm font-bold text-gray-500">Total</span>
              <span className="text-2xl font-black text-gray-900">${finalPrice.toLocaleString()}</span>
           </div>
           <button 
             onClick={onAddToCart}
             className="w-full py-4 bg-[var(--forest-dark)] text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
           >
             Cargar Combo <ArrowRight size={16} />
           </button>
           <p className="text-center text-[0.7rem] text-gray-400 mt-3 font-medium">💸 Envíos gratis a todo el país superando los $120.000</p>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ComboBuilder() {
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [packaging, setPackaging] = useState(null);
  const { addToCart, setIsCartOpen } = useCart();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { data } = await supabase.from('products').select('*').gt('stock', 0);
      const grouped = {};
      CATEGORIES.forEach(c => grouped[c.key] = []);
      data?.forEach(p => { if (grouped[p.category]) grouped[p.category].push(p); });
      setProducts(grouped);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const selectedItems = useMemo(() => Object.values(selections).filter(Boolean), [selections]);
  const itemCount = selectedItems.length;
  const subtotal = useMemo(() => selectedItems.reduce((acc, p) => acc + (p.promo_price || p.price), 0), [selectedItems]);
  const discount = useMemo(() => (DISCOUNT_TIERS.slice().reverse().find(t => itemCount >= t.min))?.pct || 0, [itemCount]);
  const finalPrice = Math.round(subtotal * (1 - discount / 100));

  const handleToggle = (cat, product) => {
    setSelections(prev => ({ ...prev, [cat]: prev[cat]?.id === product.id ? null : product }));
  };

  const currentPackaging = useMemo(() => {
    const catMap = {};
    CATEGORIES.forEach(c => catMap[c.key] = !!selections[c.key]);
    return resolvePackaging(catMap);
  }, [selections]);

  return (
    <div className="min-h-screen bg-[#F4F0E8] py-10 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-12 text-center lg:text-left">
           <span className="text-[0.65rem] font-black tracking-[0.3em] uppercase text-[var(--forest-dark)] bg-green-50 px-4 py-1.5 rounded-full border border-green-100">Configurador Pro Premium</span>
           <h1 className="text-4xl lg:text-5xl font-black mt-4 tracking-tighter text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>ARMA TU COMBO PERFECTO</h1>
           <p className="text-gray-500 mt-2 text-lg font-medium">Elegí tus favoritos y el descuento se aplica solo. 🧉🦅</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
          
          <main className="min-h-[500px]">
            {activeCategory === null ? (
              /* Landing Grid View */
              <div className="fade-in">
                <div className="mb-6 flex items-center justify-between">
                   <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">1. Seleccioná Categorías</h2>
                </div>
                <div className="combo-landing-grid">
                   {CATEGORIES.map(cat => (
                     <CategoryCard 
                       key={cat.key} 
                       cat={cat} 
                       selected={selections[cat.key]} 
                       onClick={setActiveCategory} 
                     />
                   ))}
                </div>

                {/* Packaging Section below grid */}
                {itemCount > 0 && (
                  <div className="mt-10 bg-white p-6 rounded-2xl border border-bone-300 shadow-sm">
                     <div className="flex items-center gap-3 mb-4">
                        <Package size={22} className="text-[var(--forest-dark)]" />
                        <div>
                           <h3 className="font-bold text-gray-800">Elige tu Packaging Final</h3>
                           <p className="text-xs text-gray-400">{currentPackaging.disabled ? currentPackaging.reason : 'Cómo enviaremos tu combo'}</p>
                        </div>
                     </div>
                     {!currentPackaging.disabled && (
                        <div className="flex flex-wrap gap-2">
                           {currentPackaging.options.map(opt => (
                             <button 
                               key={opt}
                               onClick={() => setPackaging(opt)}
                               className={`px-5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${packaging === opt ? 'bg-[var(--forest-dark)] text-white border-[var(--forest-dark)]' : 'bg-white text-gray-600 border-gray-100'}`}
                             >
                               📦 {opt}
                             </button>
                           ))}
                        </div>
                     )}
                  </div>
                )}
              </div>
            ) : (
              /* Picker View */
              <div className="combo-picker-layout">
                <aside className="picker-sidebar">
                   <button 
                     className="sidebar-icon-btn mb-2 bg-[#e8e4db] hover:bg-white" 
                     onClick={() => setActiveCategory(null)}
                   >
                     <ChevronLeft size={20} />
                   </button>
                   {CATEGORIES.map(cat => (
                     <button 
                       key={cat.key}
                       className={`sidebar-icon-btn ${activeCategory === cat.key ? 'active' : ''}`}
                       onClick={() => setActiveCategory(cat.key)}
                       title={cat.label}
                     >
                       <span className="relative">
                         {cat.emoji}
                         {selections[cat.key] && (
                           <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center border border-[var(--forest-dark)]">
                              <Check size={8} className="text-[var(--forest-dark)]" strokeWidth={4} />
                           </div>
                         )}
                       </span>
                     </button>
                   ))}
                </aside>

                <div className="fade-in">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{CATEGORIES.find(c => c.key === activeCategory)?.emoji}</span>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{activeCategory}</h2>
                      </div>
                      <button 
                        onClick={() => setActiveCategory(null)}
                        className="text-xs font-bold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-white"
                      >
                        VOLVER AL MENÚ
                      </button>
                   </div>

                   {loading ? (
                     <div className="picker-grid">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-[4/5] bg-gray-100 rounded-2xl animate-pulse" />)}
                     </div>
                   ) : (
                     <div className="picker-grid">
                        {products[activeCategory]?.map(p => (
                          <ProductCard 
                            key={p.id} 
                            product={p} 
                            selected={selections[activeCategory]?.id === p.id}
                            onToggle={(product) => handleToggle(activeCategory, product)}
                          />
                        ))}
                     </div>
                   )}
                </div>
              </div>
            )}
          </main>

          <aside className="hidden lg:block">
            <VisualBox 
              selections={selections}
              discount={discount}
              subtotal={subtotal}
              finalPrice={finalPrice}
              itemCount={itemCount}
              onAddToCart={() => {
                selectedItems.forEach(p => addToCart(p));
                setIsCartOpen(true);
              }}
            />
          </aside>

        </div>
      </div>

      {/* Mobile Sticky Bar */}
      {itemCount > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-100 p-4 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
           <div className="flex items-center justify-between">
              <div>
                 <p className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider">{itemCount} PRODUCTOS</p>
                 <p className="text-xl font-black text-gray-900">${finalPrice.toLocaleString()}</p>
              </div>
              <button 
                onClick={() => {
                  selectedItems.forEach(p => addToCart(p));
                  setIsCartOpen(true);
                }}
                className="bg-[var(--forest-dark)] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 text-sm shadow-xl"
              >
                Cargar Carrito <ShoppingBag size={18} />
              </button>
           </div>
        </div>
      )}

    </div>
  );
}
