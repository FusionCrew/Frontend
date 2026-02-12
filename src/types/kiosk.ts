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
  optionGroups?: OptionGroup[];
}

export interface OptionGroup {
  optionGroupId: string;
  name: string;
  isRequired: boolean;
  isMultipleSelectionAllowed: boolean;
  optionItems: OptionItem[];
}

export interface OptionItem {
  optionItemId: string;
  name: string;
  extraPrice: number;
}

export interface CartItem {
  menu: MenuItem;
  quantity: number;
  side: string;
  drink: string;
  size: string;
  removedIngredients: string[];
  selectedOptions?: SelectedOption[];
  isLargeSet?: boolean;
  itemId?: string;
}

export interface SelectedOption {
  optionGroupId: string;
  optionGroupName: string;
  optionItemId: string;
  name: string;
  extraPrice: number;
}

export type CategoryType = "burger" | "side" | "drink" | "all";
