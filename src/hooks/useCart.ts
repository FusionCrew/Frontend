import { useState } from "react";
import { MenuItem, CartItem, SelectedOption } from "../types/kiosk";
import { addCartItem, clearCart as clearCartApi } from "../api/services";

export function useCart(cartId?: string | null) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(false);

  // 장바구니에 추가
  const addToCart = async (
    menu: MenuItem,
    quantity: number,
    side: string,
    drink: string,
    size: string,
    removedIngredients: string[],
    isLargeSet: boolean = false,
    selectedOptions: SelectedOption[] = []
  ) => {
    // 1. API 동기화 (cartId가 있을 경우)
    let backendItemId: string | undefined = undefined;
    if (cartId) {
      try {
        const options: any = {};
        if (side) options.side = side;
        if (drink) options.drink = drink;
        if (size) options.size = size;
        if (isLargeSet) options.isLargeSet = true;
        if (removedIngredients.length > 0) options.removedIngredients = removedIngredients;
        if (selectedOptions.length > 0) options.selectedOptions = selectedOptions;

        const res = await addCartItem(cartId, {
          menuItemId: menu.menuItemId || menu.id.toString(),
          quantity,
          options
        });
        if (res?.itemId) backendItemId = res.itemId;
      } catch (e) {
        console.error("Failed to sync cart item to backend", e);
      }
    }

    // 2. 로컬 상태 업데이트
    const newItem: CartItem = {
      menu,
      quantity,
      side,
      drink,
      size,
      removedIngredients: [...removedIngredients],
      selectedOptions: [...selectedOptions],
      isLargeSet,
      itemId: backendItemId // 백엔드 아이템 ID 팔로업용
    };
    setCartItems([...cartItems, newItem]);
    setShowCart(true);
  };

  // 장바구니 아이템 수량 변경 (0이 되면 삭제)
  const updateCartQuantity = (index: number, delta: number) => {
    const newItems = [...cartItems];
    const newQty = newItems[index].quantity + delta;

    // TODO: 백엔드 수량 변경 API 연동 (optional for now)

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
    return cartItems.reduce((total, item) => {
      let itemPrice = item.menu.price;
      if (item.size === "세트") {
        itemPrice += 3000;
        if (item.isLargeSet) itemPrice += 500;
      }
      // 옵션 가격 추가
      const optionsPrice = (item.selectedOptions || []).reduce((sum, opt) => sum + opt.extraPrice, 0);
      return total + (itemPrice + optionsPrice) * item.quantity;
    }, 0);
  };

  // 장바구니 비우기
  const clearCart = async () => {
    if (cartId) {
      try {
        await clearCartApi(cartId);
      } catch (e) {
        console.error("Failed to clear cart on backend", e);
      }
    }
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

