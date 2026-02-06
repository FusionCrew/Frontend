import { useState } from "react";
import { MenuItem, CartItem } from "../types/kiosk";

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(false);

  // 장바구니에 추가
  const addToCart = (
    menu: MenuItem,
    quantity: number,
    side: string,
    drink: string,
    size: string,
    removedIngredients: string[]
  ) => {
    const newItem: CartItem = {
      menu,
      quantity,
      side,
      drink,
      size,
      removedIngredients: [...removedIngredients],
    };
    setCartItems([...cartItems, newItem]);
    setShowCart(true);
  };

  // 장바구니 아이템 수량 변경 (0이 되면 삭제)
  const updateCartQuantity = (index: number, delta: number) => {
    const newItems = [...cartItems];
    const newQty = newItems[index].quantity + delta;
    
    if (newQty <= 0) {
      // 아이템 삭제
      newItems.splice(index, 1);
      setCartItems(newItems);
      // 장바구니가 비면 닫기
      if (newItems.length === 0) {
        setShowCart(false);
        setCartExpanded(false);
      }
    } else {
      newItems[index].quantity = newQty;
      setCartItems(newItems);
    }
  };

  // 장바구니 아이템 삭제
  const removeFromCart = (index: number) => {
    const newItems = [...cartItems];
    newItems.splice(index, 1);
    setCartItems(newItems);
    if (newItems.length === 0) {
      setShowCart(false);
      setCartExpanded(false);
    }
  };

  // 장바구니 총 가격 계산
  const calculateCartTotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.menu.price * item.quantity,
      0
    );
  };

  // 장바구니 비우기
  const clearCart = () => {
    setCartItems([]);
    setShowCart(false);
    setCartExpanded(false);
  };

  // 장바구니 토글
  const toggleCartExpanded = () => {
    setCartExpanded(!cartExpanded);
  };

  return {
    cartItems,
    showCart,
    cartExpanded,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    calculateCartTotal,
    clearCart,
    toggleCartExpanded,
    setShowCart,
  };
}

