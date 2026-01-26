// API 서비스 - 실제 API 연동 시 이 파일만 수정하면 됨

import { apiFetch, USE_MOCK_DATA } from "./config";
import { 
  MenuItem, 
  PointInfo, 
  Order, 
  PaymentResult, 
  StaffCallResult,
  ApiResponse 
} from "./types";
import { 
  mockMenuItems, 
  mockRecommendedItems, 
  mockPointLookup, 
  mockProcessPayment 
} from "./mockData";

// ============================================
// 메뉴 관련 API
// ============================================

/**
 * 전체 메뉴 목록 조회
 * GET /menus
 */
export async function getMenuItems(): Promise<MenuItem[]> {
  if (USE_MOCK_DATA) {
    return mockMenuItems;
  }
  
  const response = await apiFetch<ApiResponse<MenuItem[]>>("/menus");
  return response.data || [];
}

/**
 * 카테고리별 메뉴 조회
 * GET /menus?category={category}
 */
export async function getMenusByCategory(
  category: "burgerSingle" | "burgerSet" | "side" | "drink"
): Promise<MenuItem[]> {
  if (USE_MOCK_DATA) {
    return mockMenuItems.filter(item => item.category === category);
  }
  
  const response = await apiFetch<ApiResponse<MenuItem[]>>(`/menus?category=${category}`);
  return response.data || [];
}

/**
 * 추천 메뉴 조회
 * GET /menus/recommended
 */
export async function getRecommendedMenus(): Promise<MenuItem[]> {
  if (USE_MOCK_DATA) {
    return mockRecommendedItems;
  }
  
  const response = await apiFetch<ApiResponse<MenuItem[]>>("/menus/recommended");
  return response.data || [];
}

/**
 * 메뉴 상세 조회
 * GET /menus/{id}
 */
export async function getMenuDetail(menuId: number): Promise<MenuItem | null> {
  if (USE_MOCK_DATA) {
    return mockMenuItems.find(item => item.id === menuId) || null;
  }
  
  const response = await apiFetch<ApiResponse<MenuItem>>(`/menus/${menuId}`);
  return response.data || null;
}

// ============================================
// 포인트 관련 API
// ============================================

/**
 * 전화번호로 포인트 조회
 * GET /points?phone={phoneNumber}
 */
export async function getPointsByPhone(phoneNumber: string): Promise<PointInfo | null> {
  if (USE_MOCK_DATA) {
    // 1초 딜레이로 실제 API 호출 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockPointLookup(phoneNumber);
  }
  
  const response = await apiFetch<ApiResponse<PointInfo>>(`/points?phone=${phoneNumber}`);
  return response.data || null;
}

/**
 * 포인트 사용
 * POST /points/use
 */
export async function usePoints(
  phoneNumber: string, 
  amount: number
): Promise<{ success: boolean; remainingPoints: number }> {
  if (USE_MOCK_DATA) {
    const pointInfo = mockPointLookup(phoneNumber);
    if (pointInfo && pointInfo.availablePoints >= amount) {
      return { success: true, remainingPoints: pointInfo.availablePoints - amount };
    }
    return { success: false, remainingPoints: 0 };
  }
  
  const response = await apiFetch<ApiResponse<{ success: boolean; remainingPoints: number }>>(
    "/points/use",
    {
      method: "POST",
      body: JSON.stringify({ phoneNumber, amount }),
    }
  );
  return response.data || { success: false, remainingPoints: 0 };
}

// ============================================
// 주문 관련 API
// ============================================

/**
 * 주문 생성
 * POST /orders
 */
export async function createOrder(order: Omit<Order, "orderId" | "orderNumber" | "createdAt">): Promise<Order> {
  if (USE_MOCK_DATA) {
    return {
      ...order,
      orderId: Date.now(),
      orderNumber: Math.floor(Math.random() * 900) + 100,
      createdAt: new Date().toISOString(),
    };
  }
  
  const response = await apiFetch<ApiResponse<Order>>("/orders", {
    method: "POST",
    body: JSON.stringify(order),
  });
  return response.data!;
}

/**
 * 결제 처리
 * POST /payments
 */
export async function processPayment(
  orderId: number,
  paymentMethod: "card" | "point" | "simple",
  amount: number
): Promise<PaymentResult> {
  if (USE_MOCK_DATA) {
    // 3초 결제 처리 시뮬레이션
    const result = await mockProcessPayment();
    return result;
  }
  
  const response = await apiFetch<ApiResponse<PaymentResult>>("/payments", {
    method: "POST",
    body: JSON.stringify({ orderId, paymentMethod, amount }),
  });
  return response.data!;
}

// ============================================
// 기타 API
// ============================================

/**
 * 직원 호출
 * POST /staff/call
 */
export async function callStaff(kioskId?: string): Promise<StaffCallResult> {
  if (USE_MOCK_DATA) {
    return { success: true, message: "직원이 호출되었습니다." };
  }
  
  const response = await apiFetch<ApiResponse<StaffCallResult>>("/staff/call", {
    method: "POST",
    body: JSON.stringify({ kioskId: kioskId || "KIOSK_001" }),
  });
  return response.data!;
}
