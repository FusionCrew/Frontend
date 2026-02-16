import { useState } from "react";
import type { MenuItem, CartItem, SelectedOption } from "../types/kiosk";
import { addCartItem, clearCart as clearCartApi, updateCartItem } from "../api/services";

export function useCart(cartId?: string | null) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(false);

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
    let backendItemId: string | undefined;
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
          options,
        });
        if (res?.itemId) backendItemId = res.itemId;
      } catch (e) {
        console.error("Failed to sync cart item to backend", e);
      }
    }

    const newItem: CartItem = {
      menu,
      quantity,
      side,
      drink,
      size,
      removedIngredients: [...removedIngredients],
      selectedOptions: [...selectedOptions],
      isLargeSet,
      itemId: backendItemId,
    };
    setCartItems((prev) => [...prev, newItem]);
    setShowCart(true);
  };

  const appendLocalVoiceItem = (menu: MenuItem, quantity: number, itemId?: string) => {
    const newItem: CartItem = {
      menu,
      quantity,
      side: "",
      drink: "",
      size: "",
      removedIngredients: [],
      selectedOptions: [],
      isLargeSet: false,
      itemId,
    };
    setCartItems((prev) => [...prev, newItem]);
    setShowCart(true);
  };

  const updateCartQuantity = async (index: number, delta: number) => {
    const current = cartItems[index];
    if (!current) return;
    const nextQty = current.quantity + delta;
    await setCartQuantity(index, nextQty);
  };

  const setCartQuantity = async (index: number, quantity: number) => {
    const targetQty = Math.max(0, quantity);
    const current = cartItems[index];
    if (!current) return;

    if (cartId && current.itemId) {
      try {
        await updateCartItem(cartId, current.itemId, targetQty);
      } catch (e) {
        console.error("Failed to sync cart quantity to backend", e);
      }
    }

    setCartItems((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      if (targetQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = { ...next[index], quantity: targetQty };
      }
      return next;
    });

    if (targetQty <= 0 && cartItems.length <= 1) {
      setShowCart(false);
      setCartExpanded(false);
    }
  };

  const removeFromCart = async (index: number) => {
    await setCartQuantity(index, 0);
  };

  const calculateCartTotal = () => {
    return cartItems.reduce((total, item) => {
      // v2: set price is expressed via selectedOptions (e.g. side choice), not via magic "size" strings.
      let itemPrice = item.menu.price;
      const optionsPrice = (item.selectedOptions || []).reduce((sum, opt) => sum + opt.extraPrice, 0);
      return total + (itemPrice + optionsPrice) * item.quantity;
    }, 0);
  };

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

  const toggleCartExpanded = () => {
    setCartExpanded((prev) => !prev);
  };

  return {
    cartItems,
    showCart,
    cartExpanded,
    addToCart,
    appendLocalVoiceItem,
    updateCartQuantity,
    setCartQuantity,
    removeFromCart,
    calculateCartTotal,
    clearCart,
    toggleCartExpanded,
    setShowCart,
  };
}
