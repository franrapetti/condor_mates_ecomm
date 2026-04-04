import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Package, ChevronLeft, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { getImgUrl } from '../lib/imageUtils';
import './ComboBuilder.css';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'Mates',          label: 'Mates',     emoji: '🧉', max: 1 },
  { key: 'Bombillas',      label: 'Bombillas', emoji: '🪗', max: 1 },
  { key: 'Termos',         label: 'Termos',    emoji: '♨️',  max: 1 },
  { key: 'Yerbas',         label: 'Yerbas',    emoji: '🌿', max: 1 },
  // KEY FIX: DB stores category as 'Materas y Yerberas', not 'Materas'
  { key: 'Materas y Yerberas', label: 'Materas', emoji: '🧺', max: 1 },
];

const DISCOUNT_TIERS = [
  { min: 1, max: 1, pct: 0,  label: 'Precio base',    color: 'bg-bone-300' },
  { min: 2, max: 2, pct: 10, label: '10% de descuento', color: 'bg-green-100' },
  { min: 3, max: 3, pct: 15, label: '15% de descuento', color: 'bg-green-200' },
  { min: 4, max: 99, pct: 20, label: '20% de descuento', color: 'bg-forest-700' },
];

// ─── PACKAGING ALGORITHM ──────────────────────────────────────────────────────
function resolvePackaging(selected) {
  const cats = Object.keys(selected).filter(k => selected[k]);
  const has = (c) => cats.includes(c);

  if (has('Materas y Yerberas')) {
    return { options: [], disabled: true, reason: 'Las materas ya incluyen su packaging especial 🧺' };
  }
  if (has('Mates') && !has('Bombillas') && !has('Yerbas') && !has('Termos') && !has('Materas y Yerberas')) {
    return { options: ['Caja de Mate'], disabled: false };
  }
  if (has('Mates') && has('Bombillas') && has('Yerbas') && !has('Termos') && !has('Materas y Yerberas')) {
    return { options: ['Caja de Mate'], disabled: false };
  }
  if (has('Bombillas') && !has('Mates') && !has('Yerbas') && !has('Termos') && !has('Materas y Yerberas')) {
    return { options: ['Caja de Bombilla'], disabled: false };
  }
  if (has('Yerbas') && has('Bombillas') && !has('Mates') && !has('Termos') && !has('Materas y Yerberas')) {
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
          <img src={getImgUrl(selected.image_url, { w: 300, q: 80 })} alt={selected.name} />
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
        <img 
          src={getImgUrl(product.image_url, { w: 400, q: 80 })} 
          alt={product.name} 
          className="w-full h-full object-cover transition-transform group-hover:scale-110" 
        />
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
    <div className="bg-white rounded-3xl border border-bone-300 shadow-2xl p-6 flex flex-col gap-6 sticky top-6 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-forest-500 to-forest-700" />
      
      <div className="flex justify-between items-center">
        <h3 className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-gray-400">Resumen del Combo</h3>
        <span className="text-[0.65rem] font-black text-forest-700 bg-forest-50 px-2 py-1 rounded-md">{itemCount}/5 Categorías</span>
      </div>
      
      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <div className="py-10 text-center opacity-40">
             <ShoppingBag size={32} strokeWidth={1.5} className="mx-auto text-gray-300 mb-3" />
             <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tu combo está vacío</p>
          </div>
        ) : (
          items.map(p => (
            <div key={p.id} className="flex items-center gap-3 bg-gray-50/50 p-2.5 rounded-2xl border border-gray-100 hover:bg-gray-100/50 transition-colors group">
               <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200">
                 <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-[0.7rem] font-black text-gray-900 truncate leading-tight">{p.name}</p>
                  <p className="text-[0.75rem] font-bold text-forest-700 mt-0.5">${(p.promo_price || p.price).toLocaleString()}</p>
               </div>
            </div>
          ))
        )}
      </div>

      {itemCount > 0 && (
        <div className="pt-2 border-t border-dashed border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[0.7rem] font-black text-gray-400 uppercase tracking-widest">Progreso del Descuento</span>
            {discount > 0 && <span className="text-[0.7rem] font-black text-green-600">¡{discount}% OFF!</span>}
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-gray-200/50">
            <div 
              className="h-full bg-forest-700 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(35,74,46,0.3)]" 
              style={{ width: `${Math.min((itemCount / 4) * 100, 100)}%` }} 
            />
          </div>
          <p className="text-[0.6rem] font-bold text-gray-400 mt-2 text-center">
            {itemCount < 2 ? 'Agregá 1 más para 10% OFF' : itemCount < 3 ? 'Agregá 1 más para 15% OFF' : itemCount < 4 ? 'Agregá 1 más para 20% OFF' : '¡Máximo descuento alcanzado!'}
          </p>
        </div>
      )}

      {itemCount > 0 && (
        <div className="mt-auto">
           <div className="space-y-1 mb-4">
             {discount > 0 && (
               <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-400">Subtotal</span>
                  <span className="font-bold text-gray-500">${subtotal.toLocaleString()}</span>
               </div>
             )}
             <div className="flex justify-between items-end">
                <span className="text-sm font-black text-gray-900 uppercase tracking-tighter">Total Final</span>
                <span className="text-3xl font-black text-forest-800 leading-none">${finalPrice.toLocaleString()}</span>
             </div>
           </div>
           
           <button 
             onClick={onAddToCart}
             className="combo-submit-btn"
           >
             <span>Confirmar y Comprar</span>
             <ArrowRight size={18} strokeWidth={3} />
           </button>
           
           <div className="flex items-center justify-center gap-2 mt-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
             <span className="text-[0.65rem] font-black text-gray-400 uppercase">Envíos Gratis</span>
             <div className="w-1 h-1 rounded-full bg-gray-300" />
             <span className="text-[0.65rem] font-black text-forest-700 uppercase">Todo el país</span>
           </div>

           {Object.values(selections).some(p => p && p.category === 'Yerbas') && (
             <p className="text-[0.55rem] text-center text-gray-400 mt-2 leading-tight">
               *La yerba desbloquea el nivel de descuento para el combo, pero mantiene su precio de lista.
             </p>
           )}
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
  
  // Raw subtotal (without discounts)
  const subtotal = useMemo(() => selectedItems.reduce((acc, p) => acc + (p.promo_price || p.price), 0), [selectedItems]);
  
  // Get active discount percentage based on item count
  const discount = useMemo(() => (DISCOUNT_TIERS.slice().reverse().find(t => itemCount >= t.min))?.pct || 0, [itemCount]);
  
  // Margen Protegido: Apply discount only to items that are NOT Yerbas
  const finalPrice = useMemo(() => {
    return Math.round(selectedItems.reduce((acc, p) => {
      const pPrice = p.promo_price || p.price;
      if (p.category === 'Yerbas') {
        return acc + pPrice; // Full price for Yerba to protect margin
      }
      return acc + (pPrice * (1 - discount / 100)); // Discounted price for other items
    }, 0));
  }, [selectedItems, discount]);

  const handleToggle = (cat, product) => {
    setSelections(prev => ({ ...prev, [cat]: prev[cat]?.id === product.id ? null : product }));
  };

  // Animate picker area on category change
  const [pickerKey, setPickerKey] = useState(null);
  const handleSetCategory = (cat) => {
    setPickerKey(cat); // force re-render for animation
    setActiveCategory(cat);
  };

  const currentPackaging = useMemo(() => {
    const catMap = {};
    CATEGORIES.forEach(c => catMap[c.key] = !!selections[c.key]);
    return resolvePackaging(catMap);
  }, [selections]);

  const handleAddToCart = () => {
    selectedItems.forEach(p => {
      // Calculate individual discounted price to inject into the cart
      let appliedPrice = p.promo_price || p.price;
      let isDiscounted = false;
      
      if (p.category !== 'Yerbas' && discount > 0) {
         appliedPrice = Math.round(appliedPrice * (1 - discount / 100));
         isDiscounted = true;
      }
      
      addToCart({ 
        ...p, 
        promo_price: appliedPrice, // Override promo_price with combo price
        is_combo_item: true,
        combo_discount: isDiscounted ? discount : 0,
        packaging_note: packaging || null 
      });
    });
    setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8] py-10 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-12 text-center lg:text-left">
           {/* Back arrow */}
           <Link
             to="/"
             className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition-colors mb-4"
           >
             <ArrowLeft size={16} />
             Volver al catálogo
           </Link>
           <h1 className="text-4xl lg:text-5xl font-black mt-2 tracking-tighter text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>ARMÁ TU COMBO 🧉</h1>
           <p className="text-gray-500 mt-3 text-lg font-medium max-w-xl">
             Elegí tus productos favoritos — cuantos más sumás, mayor descuento autómatico te llevás.
           </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
          
          <main className="combo-main-overflow">
            <div className={`combo-transition-wrapper ${activeCategory ? 'is-picking' : ''}`}>
              
              {/* Landing Grid View */}
              <section className="combo-view landing-view">
                <div className="mb-6 flex items-center justify-between">
                   <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">1. Seleccioná Categorías</h2>
                </div>
                <div className="combo-landing-grid">
                   {CATEGORIES.map(cat => (
                     <CategoryCard 
                       key={cat.key} 
                       cat={cat} 
                       selected={selections[cat.key]} 
                       onClick={handleSetCategory} 
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
              </section>

              {/* Picker View */}
              <section className="combo-view picker-view">
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
                         onClick={() => handleSetCategory(cat.key)}
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

                   <div className="flex-1">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{CATEGORIES.find(c => c.key === activeCategory)?.emoji}</span>
                          {/* Show the user-friendly label, not the DB key */}
                          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{CATEGORIES.find(c => c.key === activeCategory)?.label}</h2>
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
                     ) : products[activeCategory]?.length === 0 ? (
                       <div className="combo-empty-state">
                         <span className="text-4xl">{CATEGORIES.find(c => c.key === activeCategory)?.emoji}</span>
                         <p className="font-bold text-gray-500 mt-3">Sin stock disponible</p>
                         <p className="text-sm text-gray-400">Pronto vamos a reponer esta categoría. ¡Chequea otras!</p>
                       </div>
                     ) : (
                       <div key={pickerKey} className="picker-grid fade-in">
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
              </section>
            </div>
          </main>

          <aside className="block lg:block">
            <VisualBox 
              selections={selections}
              discount={discount}
              subtotal={subtotal}
              finalPrice={finalPrice}
              itemCount={itemCount}
              onAddToCart={handleAddToCart}
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
                onClick={handleAddToCart}
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
