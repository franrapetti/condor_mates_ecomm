import React from 'react';
import CartDrawer from './CartDrawer';
import CrossSellModal from './CrossSellModal';
import { useCart } from '../context/CartContext';

const GlobalCart = () => {
  const { 
    cartItems, isCartOpen, setIsCartOpen, 
    isCrossSellOpen, setIsCrossSellOpen, 
    updateQuantity, removeItem, quickAdd,
    crossSells
  } = useCart();

  return (
    <>
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
      />
      
      <CrossSellModal 
        isOpen={isCrossSellOpen}
        onClose={() => {
          setIsCrossSellOpen(false);
          setIsCartOpen(true);
        }}
        onQuickAdd={(p) => {
          quickAdd(p);
          setIsCartOpen(true);
        }}
        crossSells={crossSells}
      />
    </>
  );
};

export default GlobalCart;
