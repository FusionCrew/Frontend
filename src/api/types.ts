// API 응답 타입 정의
export interface MenuItem {
  id: number;
  menuItemId?: string; // Original ID from backend
  name: string;
  price: number;
  category: "burgerSingle" | "burgerSet" | "side" | "drink";
  image?: string;
  ingredients?: string[];
  optionGroups?: KioskOptionGroupDto[];
  description?: string;
}

export interface KioskOptionGroupDto {
  optionGroupId: string;
  name: string;
  isRequired: boolean;
  isMultipleSelectionAllowed: boolean;
  optionItems: KioskOptionItemDto[];
}

export interface KioskOptionItemDto {
  optionItemId: string;
  name: string;
  extraPrice: number;
}

export interface PointInfo {
  phoneNumber: string;
  availablePoints: number;
  memberName?: string;
}

export interface OrderItem {
  menuId: number;
  menuName: string;
  quantity: number;
  size?: string;
  side?: string;
  drink?: string;
  removedIngredients?: string[];
  price: number;
}

export interface Order {
  orderId?: number;
  orderNumber?: number;
  items: OrderItem[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: "card" | "point" | "simple";
  status: "pending" | "processing" | "completed" | "cancelled";
  createdAt?: string;
}

export interface PaymentResult {
  success: boolean;
  orderNumber: number;
  message?: string;
}

export interface StaffCallResult {
  success: boolean;
  message: string;
}

// API 응답 래퍼
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface KioskMenuListResponse {
  success: boolean;
  data: {
    items: KioskMenuItemDto[];
    page?: {
      size: number;
      nextCursor: string;
    }
  };
  timestamp: string;
  requestId: string;
}

export interface KioskMenuItemDto {
  menuItemId: string;
  name: string;
  price: number;
  thumbnailUrl?: string;
  isAvailable?: boolean;
  categoryId: string;
  imageUrl?: string;
  hidden?: boolean;
  description?: string;
  ingredients?: string[];
  optionGroups?: KioskOptionGroupDto[];
}
