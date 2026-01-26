import { MenuItem } from "../types/kiosk";

// 카테고리별 메뉴 데이터
export const menuData: Record<string, MenuItem[]> = {
  burgerSingle: [
    { id: 1, name: "통새우 와퍼", price: 6000 },
    { id: 2, name: "통새우 와퍼", price: 6000 },
    { id: 3, name: "통새우 와퍼", price: 6000 },
    { id: 4, name: "치즈버거", price: 5000 },
    { id: 5, name: "불고기버거", price: 5500 },
    { id: 6, name: "더블와퍼", price: 8000 },
  ],
  burgerSet: [
    { id: 1, name: "와퍼 세트", price: 9000 },
    { id: 2, name: "치즈버거 세트", price: 7500 },
    { id: 3, name: "불고기버거 세트", price: 8000 },
    { id: 4, name: "더블와퍼 세트", price: 11000 },
    { id: 5, name: "통새우 세트", price: 9500 },
    { id: 6, name: "스페셜 세트", price: 12000 },
  ],
  side: [
    { id: 1, name: "감자튀김", price: 2500 },
    { id: 2, name: "치즈스틱", price: 3000 },
    { id: 3, name: "너겟", price: 3500 },
    { id: 4, name: "어니언링", price: 2800 },
    { id: 5, name: "콘샐러드", price: 2000 },
    { id: 6, name: "치킨텐더", price: 4000 },
  ],
  drink: [
    { id: 1, name: "콜라", price: 2000 },
    { id: 2, name: "사이다", price: 2000 },
    { id: 3, name: "오렌지주스", price: 2500 },
    { id: 4, name: "아이스티", price: 2500 },
    { id: 5, name: "커피", price: 1500 },
    { id: 6, name: "밀크쉐이크", price: 3500 },
  ],
};

// 카테고리별 라벨
export const categoryLabels: Record<string, string> = {
  burgerSingle: "버거 단품",
  burgerSet: "버거 세트",
  side: "사이드",
  drink: "음료",
};

// 재료 옵션
export const ingredients = ["양파", "치즈", "양상추", "피클"];

// 사이드 옵션
export const sideOptions = ["후렌치 후라이", "치즈스틱", "코올슬로"];

// 음료 옵션
export const drinkOptions = ["제로 콜라", "사이다", "콜라", "환타"];
