// 키오스크 공통 타입 정의

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  ingredients?: string[];
}

export interface CartItem {
  menu: MenuItem;
  quantity: number;
  side: string;
  drink: string;
  size: string;
  removedIngredients: string[];
}

export type CategoryType = "burgerSingle" | "burgerSet" | "side" | "drink";
