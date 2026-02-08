// API 서비스 - 실제 API 연동 시 이 파일만 수정하면 됨

import { apiFetch, USE_MOCK_DATA } from "./config";
import {
  MenuItem,
  PointInfo,
  Order,
  PaymentResult,
  StaffCallResult,
  ApiResponse,
  KioskMenuListResponse,
  KioskMenuItemDto
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
export async function getMenuItems(categoryId?: string): Promise<MenuItem[]> {
  if (USE_MOCK_DATA) {
    return mockMenuItems;
  }

  const endpoint = categoryId ? `/kiosk/menu-items?categoryId=${categoryId}` : "/kiosk/menu-items";
  const response = await apiFetch<KioskMenuListResponse>(endpoint);

  if (!response.success || !response.data) return [];

  return response.data.items.map(item => ({
    id: parseInt(item.menuItemId.split('_')[1]) || 0, // Converting pay_0001 or similar to number if possible, or just keeping it as string if type allows
    menuItemId: item.menuItemId,
    name: item.name,
    price: item.price,
    category: item.categoryId as any,
    image: item.thumbnailUrl,
    isAvailable: item.isAvailable
  })) as any;
}

/**
 * 카테고리별 메뉴 조회
 * GET /menus?category={category}
 */
export async function getMenusByCategory(
  category: string
): Promise<MenuItem[]> {
  return getMenuItems(category);
}

/**
 * 추천 메뉴 조회
 * GET /menus/recommended
 */
export async function getRecommendedMenus(sessionId: string): Promise<MenuItem[]> {
  if (USE_MOCK_DATA) {
    return mockRecommendedItems;
  }

  const response = await apiFetch<any>(`/kiosk/recommendations?sessionId=${sessionId}`);
  if (!response.success || !response.data) return [];

  return response.data.map((item: any) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    image: item.thumbnailUrl
  }));
}

/**
 * 메뉴 상세 조회
 * GET /menus/{id}
 */
export async function getMenuDetail(menuId: string): Promise<any | null> {
  if (USE_MOCK_DATA) {
    return mockMenuItems.find(item => item.id === parseInt(menuId)) || null;
  }

  const response = await apiFetch<any>(`/kiosk/menu-items/${menuId}`);
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
// 세션 관련 API
// ============================================

export async function createKioskSession(request: any): Promise<any> {
  const response = await apiFetch<any>("/kiosk/sessions", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return response;
}

export async function endKioskSession(sessionId: string): Promise<any> {
  const response = await apiFetch<any>(`/kiosk/sessions/${sessionId}/end`, {
    method: "PATCH",
  });
  return response.data;
}

export async function recordSessionEvent(sessionId: string, type: string, payload: any): Promise<any> {
  const response = await apiFetch<any>(`/kiosk/sessions/${sessionId}/events`, {
    method: "POST",
    body: JSON.stringify({
      type,
      payload: typeof payload === 'string' ? { text: payload } : payload,
      occurredAt: new Date().toISOString()
    }),
  });
  return response;
}

// ============================================
// 장바구니 관련 API
// ============================================

export async function createCart(sessionId: string): Promise<any> {
  const response = await apiFetch<any>("/kiosk/carts", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
  return response.data;
}

export async function getCart(cartId: string): Promise<any> {
  const response = await apiFetch<any>(`/kiosk/carts/${cartId}`);
  return response.data;
}

export async function addCartItem(cartId: string, item: { menuItemId: string; quantity: number; options?: any }): Promise<any> {
  const response = await apiFetch<any>(`/kiosk/carts/${cartId}/items`, {
    method: "POST",
    body: JSON.stringify(item),
  });
  return response.data;
}

export async function updateCartItem(cartId: string, itemId: string, quantity: number): Promise<any> {
  const response = await apiFetch<any>(`/kiosk/carts/${cartId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
  return response.data;
}

export async function clearCart(cartId: string): Promise<any> {
  const response = await apiFetch<any>(`/kiosk/carts/${cartId}/items`, {
    method: "DELETE",
  });
  return response.data;
}

// ============================================
// 주문 관련 API
// ============================================

/**
 * 주문 생성 (결제 전)
 */
export async function createOrder(order: any): Promise<any> {
  const response = await apiFetch<any>("/kiosk/orders", {
    method: "POST",
    body: JSON.stringify(order),
  });
  return response.data;
}

/**
 * 주문 확정 (결제 후)
 */
export async function confirmOrder(orderId: string): Promise<any> {
  const response = await apiFetch<any>(`/kiosk/orders/${orderId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ agreeToPolicy: true }),
  });
  return response.data;
}

// ============================================
// 대기표 관련 API
// ============================================

export async function requestTicket(orderId: string): Promise<any> {
  const response = await apiFetch<any>("/kiosk/tickets", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
  return response.data;
}

export async function getTicket(ticketId: string): Promise<any> {
  const response = await apiFetch<any>(`/kiosk/tickets/${ticketId}`);
  return response.data;
}

// ============================================
// 기타 API
// ============================================

export async function submitFeedback(feedback: { sessionId: string; rating: number; comment: string }): Promise<any> {
  const response = await apiFetch<any>("/kiosk/feedback", {
    method: "POST",
    body: JSON.stringify(feedback),
  });
  return response.data;
}

/**
 * 결제 처리
 * POST /payments
 */
export async function processPayment(
  paymentData: { orderId: string; amount: number; method: string; currency?: string }
): Promise<any> {
  if (USE_MOCK_DATA) {
    const result = await mockProcessPayment();
    return result;
  }

  const response = await apiFetch<any>("/payments", {
    method: "POST",
    body: JSON.stringify({
      ...paymentData,
      currency: paymentData.currency || "KRW"
    }),
  });
  return response;
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

  const response = await apiFetch<any>("/kiosk/staff-calls", {
    method: "POST",
    body: JSON.stringify({ kioskId: kioskId || "KIOSK_001" }),
  });
  return { success: response.success, message: response.message || "호출 완료" };
}
