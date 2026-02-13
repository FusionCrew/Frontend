// Mock 데이터 - 개발용
// API 연동 시 이 파일은 더 이상 사용하지 않음

import type { MenuItem, PointInfo } from "./types";

// 메뉴 목록 Mock 데이터
export const mockMenuItems: MenuItem[] = [
  // 버거 단품
  { id: 1, name: "통새우 와퍼", price: 6000, category: "burgerSingle", ingredients: ["양상추", "토마토", "피클", "양파", "새우패티"] },
  { id: 2, name: "콰트로치즈와퍼", price: 6500, category: "burgerSingle", ingredients: ["양상추", "토마토", "피클", "양파", "치즈", "소고기패티"] },
  { id: 3, name: "불고기버거", price: 5500, category: "burgerSingle", ingredients: ["양상추", "불고기", "마요네즈"] },
  { id: 4, name: "치즈버거", price: 5000, category: "burgerSingle", ingredients: ["양상추", "토마토", "피클", "치즈", "소고기패티"] },
  { id: 5, name: "더블와퍼", price: 8000, category: "burgerSingle", ingredients: ["양상추", "토마토", "피클", "양파", "소고기패티x2"] },
  { id: 6, name: "베이컨와퍼", price: 7000, category: "burgerSingle", ingredients: ["양상추", "토마토", "피클", "양파", "베이컨", "소고기패티"] },

  // 버거 세트
  { id: 11, name: "통새우 와퍼 세트", price: 9000, category: "burgerSet", ingredients: ["양상추", "토마토", "피클", "양파", "새우패티"] },
  { id: 12, name: "콰트로치즈와퍼 세트", price: 9500, category: "burgerSet", ingredients: ["양상추", "토마토", "피클", "양파", "치즈", "소고기패티"] },
  { id: 13, name: "불고기버거 세트", price: 8500, category: "burgerSet", ingredients: ["양상추", "불고기", "마요네즈"] },

  // 사이드
  { id: 21, name: "감자튀김", price: 2500, category: "side" },
  { id: 22, name: "치즈스틱", price: 3000, category: "side" },
  { id: 23, name: "어니언링", price: 2800, category: "side" },
  { id: 24, name: "너겟", price: 3500, category: "side" },

  // 음료
  { id: 31, name: "콜라", price: 2000, category: "drink" },
  { id: 32, name: "사이다", price: 2000, category: "drink" },
  { id: 33, name: "오렌지주스", price: 2500, category: "drink" },
  { id: 34, name: "아메리카노", price: 3000, category: "drink" },
];

// 추천 메뉴 Mock 데이터
export const mockRecommendedItems: MenuItem[] = mockMenuItems.filter(
  item => [1, 2, 5, 11, 12].includes(item.id)
);

// 포인트 조회 Mock 데이터
export const mockPointLookup = (phoneNumber: string): PointInfo | null => {
  // 전화번호 기반 mock 데이터
  const mockPoints: Record<string, PointInfo> = {
    "01012345678": { phoneNumber: "01012345678", availablePoints: 5000, memberName: "홍길동" },
    "01087654321": { phoneNumber: "01087654321", availablePoints: 12000, memberName: "김철수" },
    "01011112222": { phoneNumber: "01011112222", availablePoints: 0, memberName: "이영희" },
  };

  return mockPoints[phoneNumber] || { phoneNumber, availablePoints: 3000, memberName: "회원" };
};

// 주문번호 생성 Mock
export const mockGenerateOrderNumber = (): number => {
  return Math.floor(Math.random() * 900) + 100; // 100-999
};

// 결제 처리 Mock (3초 딜레이)
export const mockProcessPayment = (): Promise<{ success: boolean; orderNumber: number }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        orderNumber: mockGenerateOrderNumber(),
      });
    }, 3000);
  });
};
