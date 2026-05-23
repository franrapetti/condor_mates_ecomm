import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastContext';
import { trackPixelEvent, logAnalyticsEvent } from '../lib/analytics';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('mate_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCrossSellOpen, setIsCrossSellOpen] = useState(false);
  const [allCrossSells, setAllCrossSells] = useState([]);
  const [crossSells, setCrossSells] = useState([]);

  const { addToast } = useToast();

  useEffect(() => {
    localStorage.setItem('mate_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    const fetchCrossSells = async () => {
      const { data } = await supabase.from('products')
        .select('*')
        .in('category', ['Yerbas', 'Bombillas'])
        .not('name', 'ilike', '%Kurupí%')
        .limit(15);
      if (data) setAllCrossSells(data);
    };
    fetchCrossSells();
  }, []);

  const addToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      const maxStock = product.stock ?? 999; // fallback if no stock field
      
      if (currentQty + quantity > maxStock) {
        addToast(`Solo quedan ${maxStock} unidad${maxStock !== 1 ? 'es' : ''} de "${product.name}".`, 'error');
        return prev; // don't change the cart
      }
      
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity }];
    });
    
    const maxStock = product.stock ?? 999;
    const existing = cartItems.find(item => item.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + quantity <= maxStock) {
      addToast(`¡${product.name} agregado al carrito!`, 'success');

      // Meta Pixel: AddToCart event
      trackPixelEvent('AddToCart', {
        content_name: product.name,
        content_ids: [String(product.combo_parent_id || product.id)],
        content_type: 'product',
        content_category: product.category || '',
        value: product.promo_price || product.price,
        currency: 'ARS',
      });

      // Funnel tracking
      logAnalyticsEvent('add_to_cart', {
        product_id: product.combo_parent_id || product.id,
        product_name: product.name,
        price: product.promo_price || product.price,
      });
      if (product.category === 'Mates' && product.quick_add_upsell && allCrossSells.length > 0) {
        // Randomize 2 cross sells
        const shuffled = [...allCrossSells].sort(() => 0.5 - Math.random());
        setCrossSells(shuffled.slice(0, 2));
        setIsCrossSellOpen(true);
      } else {
        setIsCartOpen(true);
      }
    }
  };

  const updateQuantity = (id, quantity) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    setCartItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const maxStock = item.stock ?? 999;
      if (quantity > maxStock) {
        addToast(`Stock máximo alcanzado: ${maxStock} unidades.`, 'error');
        return item; // don't update
      }
      return { ...item, quantity };
    }));
  };

  const removeItem = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
    addToast('Producto eliminado del carrito.', 'error');
  };

  const quickAdd = (product) => {
    const existing = cartItems.find(item => item.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    const maxStock = product.stock ?? 999;

    if (currentQty + 1 > maxStock) {
      addToast(`Solo quedan ${maxStock} unidad${maxStock !== 1 ? 'es' : ''} de "${product.name}".`, 'error');
      return;
    }

    setCartItems(prev => {
      const ex = prev.find(item => item.id === product.id);
      if (ex) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    addToast(`¡${product.name} agregado rápidamente!`, 'success');

    // Meta Pixel: AddToCart event (quick add)
    trackPixelEvent('AddToCart', {
      content_name: product.name,
      content_ids: [String(product.id)],
      content_type: 'product',
      content_category: product.category || '',
      value: product.promo_price || product.price,
      currency: 'ARS',
    });

    // Funnel tracking
    logAnalyticsEvent('add_to_cart', {
      product_id: product.id,
      product_name: product.name,
      price: product.promo_price || product.price,
    });
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('mate_cart');
  };

  return (
    <CartContext.Provider value={{
      cartItems, cartCount,
      isCartOpen, setIsCartOpen,
      isCrossSellOpen, setIsCrossSellOpen,
      crossSells,
      addToCart: addToCart, 
      updateQuantity: updateQuantity, 
      removeItem: removeItem, 
      quickAdd: quickAdd,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
