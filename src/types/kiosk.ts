// 키오스크 공통 타입 정의

export interface MenuItem {
  id: number;
  menuItemId?: string;
  name: string;
  price: number;
  category?: string;
  categoryId?: string;
  image?: string;
  isAvailable?: boolean;
  ingredients?: string[];
}

export interface CartItem {
  menu: MenuItem;
  quantity: number;
  side: string;
  drink: string;
  size: string;
  removedIngredients: string[];
  itemId?: string;
}

export type CategoryType = "burgerSingle" | "burgerSet" | "side" | "drink";
