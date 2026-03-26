import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('mate_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCrossSellOpen, setIsCrossSellOpen] = useState(false);
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
        .limit(2);
      if (data) setCrossSells(data);
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
      if (product.category === 'Mates' && product.quick_add_upsell && crossSells.length > 0) {
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
