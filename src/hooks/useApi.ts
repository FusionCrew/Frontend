// API 연동용 커스텀 훅들

import { useState, useEffect, useCallback } from "react";
import { 
  getMenuItems, 
  getMenusByCategory, 
  getRecommendedMenus,
  getPointsByPhone,
  processPayment,
  callStaff 
} from "../api/services";
import { MenuItem, PointInfo } from "../api/types";

/**
 * 메뉴 목록 조회 훅
 */
export function useMenuItems(category?: "burgerSingle" | "burgerSet" | "side" | "drink") {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setLoading(true);
        const data = category 
          ? await getMenusByCategory(category)
          : await getMenuItems();
        setItems(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "메뉴를 불러오는데 실패했습니다");
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, [category]);

  return { items, loading, error, refetch: () => {} };
}

/**
 * 추천 메뉴 조회 훅
 */
export function useRecommendedMenus() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommended = async () => {
      try {
        setLoading(true);
        const data = await getRecommendedMenus();
        setItems(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "추천 메뉴를 불러오는데 실패했습니다");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommended();
  }, []);

  return { items, loading, error };
}

/**
 * 포인트 조회 훅
 */
export function usePoints() {
  const [pointInfo, setPointInfo] = useState<PointInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupPoints = useCallback(async (phoneNumber: string) => {
    try {
      setLoading(true);
      const data = await getPointsByPhone(phoneNumber);
      setPointInfo(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "포인트 조회에 실패했습니다");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPointInfo(null);
    setError(null);
  }, []);

  return { pointInfo, loading, error, lookupPoints, reset };
}

/**
 * 결제 처리 훅
 */
export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  const pay = useCallback(async (
    orderId: number,
    paymentMethod: "card" | "point" | "simple",
    amount: number
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await processPayment(orderId, paymentMethod, amount);
      if (result.success) {
        setOrderNumber(result.orderNumber);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "결제에 실패했습니다");
      return { success: false, orderNumber: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setOrderNumber(null);
    setError(null);
  }, []);

  return { loading, error, orderNumber, pay, reset };
}

/**
 * 직원 호출 훅
 */
export function useStaffCall() {
  const [loading, setLoading] = useState(false);
  const [called, setCalled] = useState(false);

  const call = useCallback(async () => {
    try {
      setLoading(true);
      await callStaff();
      setCalled(true);
    } catch {
      // 에러가 발생해도 UI에서는 호출됨으로 표시
      setCalled(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCalled(false);
  }, []);

  return { loading, called, call, reset };
}
