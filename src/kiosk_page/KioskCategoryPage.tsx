import { useState } from "react";
import { StaffCallButton, BackButton, KioskCharacter, BottomPanel } from "../components/KioskComponents";
import CategoryBar from "../components/CategoryBar";
import PaymentSelectionScreen from "./PaymentSelectionScreen";
import PaymentProcessingScreen from "./PaymentProcessingScreen";
import PaymentCompleteScreen from "./PaymentCompleteScreen";
import recommendedBurger from "../assets/recommended_burger.png";
import backArrowCircle from "../assets/back_arrow_circle.png";

interface KioskCategoryPageProps {
  onBack: () => void;
  onCategory: (category: string) => void;
  currentCategory: "burgerSingle" | "burgerSet" | "side" | "drink";
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
}

// 카테고리별 메뉴 데이터
const menuData: Record<string, MenuItem[]> = {
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
const categoryLabels: Record<string, string> = {
  burgerSingle: "버거 단품",
  burgerSet: "버거 세트",
  side: "사이드",
  drink: "음료",
};

export default function KioskCategoryPage({ onBack, onCategory, currentCategory }: KioskCategoryPageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [allergyOpen, setAllergyOpen] = useState(false);
  const [showSizeSelection, setShowSizeSelection] = useState(false);
  const [showIngredientChange, setShowIngredientChange] = useState(false);
  const [ingredientAccordionOpen, setIngredientAccordionOpen] = useState(false);
  const [setMenuAccordionOpen, setSetMenuAccordionOpen] = useState(false);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [selectedSide, setSelectedSide] = useState("후렌치 후라이");
  const [selectedDrink, setSelectedDrink] = useState("제로 콜라");
  const [rSizeQty, setRSizeQty] = useState(1);
  const [lSizeQty, setLSizeQty] = useState(1);
  
  // 장바구니 상태
  const [cartItems, setCartItems] = useState<{
    menu: MenuItem;
    quantity: number;
    side: string;
    drink: string;
    size: string;
    removedIngredients: string[];
  }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(false);
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
  const [showPaymentProcessing, setShowPaymentProcessing] = useState(false);
  const [showPaymentComplete, setShowPaymentComplete] = useState(false);
  
  const itemsPerPage = 3;
  const menuItems = menuData[currentCategory] || [];

  // 재료 목록
  const ingredients = ["양파", "치즈", "양상추", "피클"];
  
  // 사이드 옵션
  const sideOptions = ["후렌치 후라이", "치즈스틱", "코올슬로"];
  
  // 음료 옵션
  const drinkOptions = ["제로 콜라", "사이다", "콜라", "환타"];

  // 재료 토글
  const toggleIngredient = (ingredient: string) => {
    if (removedIngredients.includes(ingredient)) {
      setRemovedIngredients(removedIngredients.filter(i => i !== ingredient));
    } else {
      setRemovedIngredients([...removedIngredients, ingredient]);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - itemsPerPage));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => 
      Math.min(menuItems.length - itemsPerPage, prev + itemsPerPage)
    );
  };

  const visibleItems = menuItems.slice(currentIndex, currentIndex + itemsPerPage);

  // 메뉴 선택
  const handleSelectMenu = (item: MenuItem) => {
    setSelectedMenu(item);
    setNutritionOpen(false);
    setAllergyOpen(false);
  };

  // 상세에서 뒤로가기
  const handleBackFromDetail = () => {
    setSelectedMenu(null);
    setNutritionOpen(false);
    setAllergyOpen(false);
  };

  // 영양정보 토글
  const toggleNutrition = () => {
    setNutritionOpen(!nutritionOpen);
    if (!nutritionOpen) setAllergyOpen(false);
  };

  // 알레르기 정보 토글
  const toggleAllergy = () => {
    setAllergyOpen(!allergyOpen);
    if (!allergyOpen) setNutritionOpen(false);
  };

  // 주문하기 클릭 -> 사이즈 선택으로
  const handleOrderClick = () => {
    setShowSizeSelection(true);
    setRSizeQty(1);
    setLSizeQty(1);
  };

  // 사이즈 선택에서 뒤로가기
  const handleBackFromSizeSelection = () => {
    setShowSizeSelection(false);
  };

  // 선택 완료 -> 재료변경 화면으로
  const handleSizeComplete = () => {
    setShowSizeSelection(false);
    setShowIngredientChange(true);
  };

  // 재료변경에서 뒤로가기
  const handleBackFromIngredient = () => {
    setShowIngredientChange(false);
    setShowSizeSelection(true);
  };

  // 장바구니에 추가
  const handleAddToCart = () => {
    if (!selectedMenu) return;
    
    const newItem = {
      menu: selectedMenu,
      quantity: rSizeQty + lSizeQty,
      side: selectedSide,
      drink: selectedDrink,
      size: rSizeQty > 0 ? "R" : "L",
      removedIngredients: [...removedIngredients]
    };
    
    setCartItems([...cartItems, newItem]);
    setShowCart(true);
    setShowIngredientChange(false);
    setSelectedMenu(null);
    setIngredientAccordionOpen(false);
    setSetMenuAccordionOpen(false);
  };

  // 장바구니 총 가격 계산
  const calculateCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.menu.price * item.quantity), 0);
  };

  // 장바구니 아이템 수량 변경
  const updateCartQuantity = (index: number, delta: number) => {
    const newItems = [...cartItems];
    newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
    setCartItems(newItems);
  };

  // 총 가격 계산
  const calculateTotal = () => {
    if (!selectedMenu) return 0;
    return selectedMenu.price * rSizeQty + (selectedMenu.price + 500) * lSizeQty;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-200">
      {/* 키오스크 프레임 - 1080x1920 */}
      <div
        className="relative overflow-hidden"
        style={{
          width: "1080px",
          height: "1920px",
          backgroundColor: "#F5EDE4",
        }}
      >
        {/* 뒤로가기 버튼 */}
        <BackButton onClick={onBack} />

        {/* 직원 호출 버튼 */}
        <StaffCallButton />

        {/* 상단 카테고리 바 - 컴포넌트 사용 */}
        <CategoryBar currentCategory={currentCategory} onCategory={onCategory} />

        {/* 하단 메뉴 패널 */}
        <BottomPanel height={showCart && cartExpanded ? "1142px" : "469px"}>
          {showCart && cartItems.length > 0 ? (
            /* 장바구니 화면 */
            <>
              {/* 화살표 버튼 (위/아래 토글) */}
              <div
                onClick={() => setCartExpanded(!cartExpanded)}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  paddingTop: "38px",
                  cursor: "pointer"
                }}
              >
                <img 
                  src={cartExpanded 
                    ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23561D02'%3E%3Cpath d='M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'/%3E%3C/svg%3E"
                    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23561D02'%3E%3Cpath d='M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z'/%3E%3C/svg%3E"
                  }
                  alt={cartExpanded ? "collapse" : "expand"}
                  style={{ width: "90px", height: "90px" }}
                />
              </div>

              {/* 장바구니 아이템들 */}
              <div style={{ padding: "0 80px" }}>
                {cartItems.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: index === 0 ? "20px" : "30px"
                    }}
                  >
                    {/* 메뉴 이미지 + 정보 */}
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <img
                        src={recommendedBurger}
                        alt={item.menu.name}
                        style={{
                          width: "100px",
                          height: "100px",
                          objectFit: "contain"
                        }}
                      />
                      <div>
                        <p style={{
                          fontFamily: "'Noto Sans KR', sans-serif",
                          fontSize: "34px",
                          fontWeight: "600",
                          color: "#4A3728",
                          marginBottom: "4px"
                        }}>{item.menu.name} 세트</p>
                        {/* 옵션 정보 - 확장 시에만 표시 */}
                        {cartExpanded && (
                          <p style={{
                            fontFamily: "'Noto Sans KR', sans-serif",
                            fontSize: "24px",
                            fontWeight: "400",
                            color: "#888888",
                            marginBottom: "4px"
                          }}>
                            {item.size} 사이즈{item.removedIngredients.length > 0 ? `, NO ${item.removedIngredients.join(", ")}` : ""}, {item.drink}
                          </p>
                        )}
                        <p style={{
                          fontFamily: "'Noto Sans KR', sans-serif",
                          fontSize: "30px",
                          fontWeight: "500",
                          color: "#C32911"
                        }}>{(item.menu.price * item.quantity).toLocaleString()}원</p>
                      </div>
                    </div>

                    {/* 수량 조절 */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "30px",
                      border: "2px solid #561D02",
                      borderRadius: "35px",
                      padding: "15px 30px"
                    }}>
                      <button
                        onClick={() => updateCartQuantity(index, -1)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "32px",
                          color: "#561D02",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                      >−</button>
                      <span style={{
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "32px",
                        fontWeight: "600",
                        color: "#561D02",
                        minWidth: "30px",
                        textAlign: "center"
                      }}>{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(index, 1)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "32px",
                          color: "#561D02",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 주문하기 버튼 */}
              <div style={{
                position: "absolute",
                bottom: "60px",
                left: "50%",
                transform: "translateX(-50%)"
              }}>
                <button
                  onClick={() => setShowPaymentSelection(true)}
                  style={{
                    width: "649px",
                    height: "129px",
                    backgroundColor: "#C32911",
                    color: "#FFFFFF",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "56px",
                    fontWeight: "600",
                    borderRadius: "65px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  {calculateCartTotal().toLocaleString()}원 주문하기
                </button>
              </div>
            </>
          ) : showIngredientChange && selectedMenu ? (
            /* 재료변경 화면 */
            <>
              {/* 뒤로가기 버튼 */}
              <button
                onClick={handleBackFromIngredient}
                style={{
                  position: "absolute",
                  top: "50px",
                  left: "80px",
                  width: "70px",
                  height: "70px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                  zIndex: 5
                }}
              >
                <img 
                  src={backArrowCircle} 
                  alt="뒤로가기" 
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </button>

              {/* 메뉴 이름 */}
              <span
                style={{
                  position: "absolute",
                  top: "60px",
                  left: "170px",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "36px",
                  fontWeight: "600",
                  color: "#4A3728"
                }}
              >
                {selectedMenu.name}
              </span>

              {/* 장바구니에 추가 / 선택 완료 버튼 */}
              <button
                onClick={
                  ingredientAccordionOpen 
                    ? () => setIngredientAccordionOpen(false) 
                    : setMenuAccordionOpen 
                      ? () => setSetMenuAccordionOpen(false)
                      : handleAddToCart
                }
                style={{
                  position: "absolute",
                  top: "53px",
                  right: "146px",
                  width: (ingredientAccordionOpen || setMenuAccordionOpen) ? "189px" : "287px",
                  height: "57px",
                  backgroundColor: "#FF9B19",
                  color: "#FFFFFF",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "26px",
                  fontWeight: "600",
                  borderRadius: "29px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                {(ingredientAccordionOpen || setMenuAccordionOpen) ? "선택 완료" : "장바구니에 추가"}
              </button>

              {/* 버거 재료변경 아코디언 - 세트 구성변경 아코디언 닫혔을 때만 표시 */}
              {!setMenuAccordionOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "160px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "788px"
                }}
              >
                {/* 아코디언 헤더 */}
                <div
                  onClick={() => setIngredientAccordionOpen(!ingredientAccordionOpen)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #E0E0E0",
                    paddingBottom: "20px",
                    cursor: "pointer"
                  }}
                >
                  <span style={{
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "30px",
                    fontWeight: "500",
                    color: "#4A3728"
                  }}>버거 재료변경</span>
                  <span style={{
                    fontSize: "30px",
                    color: "#4A3728"
                  }}>{ingredientAccordionOpen ? "−" : "+"}</span>
                </div>

                {/* 아코디언 내용 - 재료 버튼들 */}
                {ingredientAccordionOpen && (
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "30px",
                    paddingTop: "20px"
                  }}>
                    {ingredients.map((ingredient) => (
                      <button
                        key={ingredient}
                        onClick={() => toggleIngredient(ingredient)}
                        style={{
                          position: "relative",
                          width: "124px",
                          height: "58px",
                          borderRadius: "29px",
                          border: "none",
                          backgroundColor: "#F3D4CF",
                          fontFamily: "'Noto Sans KR', sans-serif",
                          fontSize: "30px",
                          fontWeight: "500",
                          color: "#C32911",
                          cursor: "pointer"
                        }}
                      >
                        {ingredient}
                        {removedIngredients.includes(ingredient) && (
                          <span style={{
                            position: "absolute",
                            top: "-8px",
                            right: "-8px",
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: "#C32911",
                            color: "#FFFFFF",
                            fontSize: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>−</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* 세트 구성변경 아코디언 */}
              {!ingredientAccordionOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: setMenuAccordionOpen ? "160px" : "270px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "788px"
                  }}
                >
                  {/* 아코디언 헤더 */}
                  <div
                    onClick={() => setSetMenuAccordionOpen(!setMenuAccordionOpen)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid #E0E0E0",
                      paddingBottom: "20px",
                      cursor: "pointer"
                    }}
                  >
                    <span style={{
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontSize: "30px",
                      fontWeight: "500",
                      color: "#4A3728"
                    }}>세트 구성변경</span>
                    {!setMenuAccordionOpen ? (
                      <span style={{
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "26px",
                        fontWeight: "500",
                        color: "#C32911",
                        cursor: "pointer"
                      }}>{selectedSide}, {selectedDrink}</span>
                    ) : (
                      <span style={{
                        fontSize: "30px",
                        color: "#4A3728"
                      }}>−</span>
                    )}
                  </div>

                  {/* 아코디언 내용 - 사이드/음료 선택 */}
                  {setMenuAccordionOpen && (
                    <div style={{ paddingTop: "20px" }}>
                      {/* 사이드 옵션 */}
                      <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "30px",
                        marginBottom: "30px"
                      }}>
                        {sideOptions.map((side) => (
                          <button
                            key={side}
                            onClick={() => setSelectedSide(side)}
                            style={{
                              padding: "12px 20px",
                              borderRadius: "25px",
                              border: selectedSide === side ? "none" : "2px solid #C32911",
                              backgroundColor: selectedSide === side ? "#C32911" : "transparent",
                              fontFamily: "'Noto Sans KR', sans-serif",
                              fontSize: "24px",
                              fontWeight: "500",
                              color: selectedSide === side ? "#FFFFFF" : "#C32911",
                              cursor: "pointer"
                            }}
                          >
                            {side}
                          </button>
                        ))}
                      </div>

                      {/* 음료 옵션 */}
                      <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "30px"
                      }}>
                        {drinkOptions.map((drink) => (
                          <button
                            key={drink}
                            onClick={() => setSelectedDrink(drink)}
                            style={{
                              padding: "12px 20px",
                              borderRadius: "25px",
                              border: selectedDrink === drink ? "none" : "2px solid #C32911",
                              backgroundColor: selectedDrink === drink ? "#C32911" : "transparent",
                              fontFamily: "'Noto Sans KR', sans-serif",
                              fontSize: "24px",
                              fontWeight: "500",
                              color: selectedDrink === drink ? "#FFFFFF" : "#C32911",
                              cursor: "pointer"
                            }}
                          >
                            {drink}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 총 가격 - 두 아코디언 다 닫혔을 때만 표시 */}
              {!ingredientAccordionOpen && !setMenuAccordionOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "55px",
                    right: "146px",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "36px",
                    fontWeight: "600",
                    color: "#4A3728"
                  }}
                >
                  총 {calculateTotal().toLocaleString()}원
                </div>
              )}
            </>
          ) : showSizeSelection && selectedMenu ? (
            /* 사이즈 선택 화면 */
            <>
              {/* 뒤로가기 버튼 */}
              <button
                onClick={handleBackFromSizeSelection}
                style={{
                  position: "absolute",
                  top: "50px",
                  left: "80px",
                  width: "70px",
                  height: "70px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                  zIndex: 5
                }}
              >
                <img 
                  src={backArrowCircle} 
                  alt="뒤로가기" 
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </button>

              {/* 메뉴 이름 */}
              <span
                style={{
                  position: "absolute",
                  top: "60px",
                  left: "170px",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "36px",
                  fontWeight: "600",
                  color: "#4A3728"
                }}
              >
                {selectedMenu.name}
              </span>

              {/* 선택 완료 버튼 - 통새우 와퍼와 같은 높이 */}
              <button
                onClick={handleSizeComplete}
                style={{
                  position: "absolute",
                  top: "53px",
                  right: "146px",
                  width: "189px",
                  height: "57px",
                  backgroundColor: "#E8A756",
                  color: "#FFFFFF",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "30px",
                  fontWeight: "600",
                  borderRadius: "29px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                선택 완료
              </button>

              {/* R 사이즈 */}
              <div
                style={{
                  position: "absolute",
                  top: "160px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "788px",
                  borderBottom: "1px solid #E0E0E0",
                  paddingBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <p style={{
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "30px",
                    fontWeight: "500",
                    color: "#4A3728",
                    marginBottom: "8px"
                  }}>R 사이즈</p>
                  <p style={{
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "30px",
                    fontWeight: "500",
                    color: "#C32911"
                  }}>{selectedMenu.price.toLocaleString()}원</p>
                </div>
                {/* 수량 조절 189x72px */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "189px",
                  height: "72px",
                  border: "2px solid #E8A756",
                  borderRadius: "36px",
                  padding: "0 20px"
                }}>
                  <button
                    onClick={() => setRSizeQty(Math.max(0, rSizeQty - 1))}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#E8A756",
                      fontSize: "30px",
                      fontWeight: "500",
                      cursor: "pointer",
                      padding: "0",
                      lineHeight: "1"
                    }}
                  >−</button>
                  <span style={{
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "30px",
                    fontWeight: "500",
                    color: "#4A3728"
                  }}>{rSizeQty}</span>
                  <button
                    onClick={() => setRSizeQty(rSizeQty + 1)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#E8A756",
                      fontSize: "30px",
                      fontWeight: "500",
                      cursor: "pointer",
                      padding: "0",
                      lineHeight: "1"
                    }}
                  >+</button>
                </div>
              </div>

              {/* L 사이즈 - R사이즈 줄 밑에서 24px 아래 */}
              <div
                style={{
                  position: "absolute",
                  top: "310px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "788px",
                  borderBottom: "1px solid #E0E0E0",
                  paddingBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <p style={{
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "30px",
                    fontWeight: "500",
                    color: "#4A3728",
                    marginBottom: "8px"
                  }}>L 사이즈</p>
                  <p style={{
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "30px",
                    fontWeight: "500",
                    color: "#C32911"
                  }}>{(selectedMenu.price + 500).toLocaleString()}원</p>
                </div>
                {/* 수량 조절 189x72px */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "189px",
                  height: "72px",
                  border: "2px solid #E8A756",
                  borderRadius: "36px",
                  padding: "0 20px"
                }}>
                  <button
                    onClick={() => setLSizeQty(Math.max(0, lSizeQty - 1))}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#E8A756",
                      fontSize: "30px",
                      fontWeight: "500",
                      cursor: "pointer",
                      padding: "0",
                      lineHeight: "1"
                    }}
                  >−</button>
                  <span style={{
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "30px",
                    fontWeight: "500",
                    color: "#4A3728"
                  }}>{lSizeQty}</span>
                  <button
                    onClick={() => setLSizeQty(lSizeQty + 1)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#E8A756",
                      fontSize: "30px",
                      fontWeight: "500",
                      cursor: "pointer",
                      padding: "0",
                      lineHeight: "1"
                    }}
                  >+</button>
                </div>
              </div>
            </>
          ) : selectedMenu && !showSizeSelection ? (
            /* 메뉴 상세 보기 */
            <>
              {/* 뒤로가기 버튼 (원형 이미지) */}
              <button
                onClick={handleBackFromDetail}
                style={{
                  position: "absolute",
                  top: "50px",
                  left: "80px",
                  width: "70px",
                  height: "70px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0",
                  zIndex: 5
                }}
              >
                <img 
                  src={backArrowCircle} 
                  alt="뒤로가기" 
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </button>

              {/* 메뉴 이름 + 주문하기 버튼 */}
              <div
                style={{
                  position: "absolute",
                  top: "103px",
                  left: "280px",
                  right: "80px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start"
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontSize: "40px",
                      fontWeight: "600",
                      color: "#4A3728",
                      marginBottom: "12px"
                    }}
                  >
                    {selectedMenu.name}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontSize: "32px",
                      fontWeight: "500",
                      color: "#C32911"
                    }}
                  >
                    {selectedMenu.price.toLocaleString()}원 ~
                  </p>
                </div>
                <button
                  onClick={handleOrderClick}
                  style={{
                    backgroundColor: "#C32911",
                    color: "#FFFFFF",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "28px",
                    fontWeight: "600",
                    padding: "18px 35px",
                    borderRadius: "16px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  주문하기
                </button>
              </div>

              {/* 메뉴 이미지 - 상하 중앙정렬 */}
              <img
                src={recommendedBurger}
                alt={selectedMenu.name}
                style={{
                  position: "absolute",
                  top: "55%",
                  left: "80px",
                  transform: "translateY(-50%)",
                  width: "160px",
                  height: "auto",
                  objectFit: "contain"
                }}
              />

              {/* 영양정보 아코디언 */}
              <div
                style={{
                  position: "absolute",
                  top: "225px",
                  left: "280px",
                  right: "80px",
                }}
              >
                {/* 영양정보 헤더 */}
                <div
                  onClick={toggleNutrition}
                  style={{
                    borderBottom: "1px solid #444444",
                    paddingBottom: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer"
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontSize: "30px",
                      fontWeight: "500",
                      color: "#4A3728"
                    }}
                  >
                    영양정보
                  </span>
                  <span
                    style={{
                      fontSize: "36px",
                      color: "#444444",
                      fontWeight: "300"
                    }}
                  >
                    {nutritionOpen ? "−" : "+"}
                  </span>
                </div>

                {/* 영양정보 내용 */}
                {nutritionOpen && (
                  <div
                    style={{
                      display: "flex",
                      gap: "20px",
                      marginTop: "20px",
                      paddingBottom: "20px"
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#FDEAEA",
                        borderRadius: "12px",
                        padding: "20px 30px",
                        textAlign: "center",
                        minWidth: "120px"
                      }}
                    >
                      <p style={{ 
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "32px", 
                        fontWeight: "700", 
                        color: "#4A3728",
                        marginBottom: "8px"
                      }}>550Cal.</p>
                      <p style={{ 
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "24px", 
                        color: "#666" 
                      }}>칼로리</p>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#FDEAEA",
                        borderRadius: "12px",
                        padding: "20px 30px",
                        textAlign: "center",
                        minWidth: "100px"
                      }}
                    >
                      <p style={{ 
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "32px", 
                        fontWeight: "700", 
                        color: "#4A3728",
                        marginBottom: "8px"
                      }}>25g</p>
                      <p style={{ 
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "24px", 
                        color: "#666" 
                      }}>단백질</p>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#FDEAEA",
                        borderRadius: "12px",
                        padding: "20px 30px",
                        textAlign: "center",
                        minWidth: "100px"
                      }}
                    >
                      <p style={{ 
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "32px", 
                        fontWeight: "700", 
                        color: "#4A3728",
                        marginBottom: "8px"
                      }}>30g</p>
                      <p style={{ 
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "24px", 
                        color: "#666" 
                      }}>지방</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 알레르기 정보 - 영양정보가 닫혀있을 때만 표시 */}
              {!nutritionOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "302px",
                    left: "280px",
                    right: "80px",
                  }}
                >
                  {/* 알레르기 정보 헤더 */}
                  <div
                    onClick={toggleAllergy}
                    style={{
                      borderBottom: "1px solid #444444",
                      paddingBottom: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer"
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "30px",
                        fontWeight: "500",
                        color: "#4A3728"
                      }}
                    >
                      알레르기 정보
                    </span>
                    <span
                      style={{
                        fontSize: "36px",
                        color: "#444444",
                        fontWeight: "300"
                      }}
                    >
                      {allergyOpen ? "−" : "+"}
                    </span>
                  </div>

                  {/* 알레르기 정보 내용 */}
                  {allergyOpen && (
                    <div
                      style={{
                        marginTop: "20px",
                        paddingBottom: "20px"
                      }}
                    >
                      <p style={{ 
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "26px", 
                        color: "#4A3728",
                        lineHeight: "1.6"
                      }}>
                        밀, 대두, 우유, 토마토, 쇠고기, 돼지고기, 계란
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* 메뉴 목록 보기 */
            <>
              {/* 카테고리 라벨 */}
              <p
                className="absolute left-1/2"
                style={{
                  top: "50px",
                  transform: "translateX(-50%)",
                  width: "850px",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "34px",
                  fontWeight: "500",
                  color: "#4A3728"
                }}
              >
                {categoryLabels[currentCategory]}
              </p>

              {/* 왼쪽 화살표 */}
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                style={{
                  position: "absolute",
                  left: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "100px",
                  color: currentIndex === 0 ? "#ccc" : "#4A3728",
                  background: "none",
                  border: "none",
                  cursor: currentIndex === 0 ? "default" : "pointer",
                  zIndex: 5
                }}
              >
                ‹
              </button>

              {/* 메뉴 아이템들 */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 flex"
                style={{ top: "120px", gap: "25px" }}
              >
                {visibleItems.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => handleSelectMenu(item)}
                    className="flex flex-col items-center"
                    style={{
                      width: "260px",
                      backgroundColor: "#FAFAFA",
                      borderRadius: "24px",
                      padding: "20px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    {/* 이미지 */}
                    <img 
                      src={recommendedBurger} 
                      alt={item.name}
                      style={{
                        width: "140px",
                        height: "auto",
                        objectFit: "contain",
                        marginBottom: "16px"
                      }}
                    />
                    {/* 메뉴 이름 */}
                    <span
                      style={{
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "32px",
                        fontWeight: "500",
                        color: "#4A3728",
                        marginBottom: "8px"
                      }}
                    >
                      {item.name}
                    </span>
                    {/* 가격 */}
                    <span
                      style={{
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "32px",
                        fontWeight: "700",
                        color: "#C32911"
                      }}
                    >
                      {item.price.toLocaleString()}원
                    </span>
                  </button>
                ))}
              </div>

              {/* 오른쪽 화살표 */}
              <button
                onClick={handleNext}
                disabled={currentIndex >= menuItems.length - itemsPerPage}
                style={{
                  position: "absolute",
                  right: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "100px",
                  color: currentIndex >= menuItems.length - itemsPerPage ? "#ccc" : "#4A3728",
                  background: "none",
                  border: "none",
                  cursor: currentIndex >= menuItems.length - itemsPerPage ? "default" : "pointer",
                  zIndex: 5
                }}
              >
                ›
              </button>
            </>
          )}
        </BottomPanel>

        {/* 사이즈 선택 시 말풍선 */}
        {showSizeSelection && (
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
            style={{
              bottom: "544px",
              width: "791px",
              height: "200px",
              backgroundColor: "#FFFFFF",
              borderRadius: "100px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "56px",
              fontWeight: "500",
              color: "#4A3728",
              zIndex: 3
            }}
          >
            사이즈를 선택해주세요
          </div>
        )}

        {/* 재료변경 화면 말풍선 */}
        {showIngredientChange && (
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
            style={{
              bottom: "544px",
              width: "791px",
              height: "200px",
              backgroundColor: "#FFFFFF",
              borderRadius: "100px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "56px",
              fontWeight: "500",
              color: "#4A3728",
              zIndex: 3
            }}
          >
            변경할 옵션을 선택해주세요
          </div>
        )}

        {/* 캐릭터 이미지 */}
        <div style={{ position: "relative", zIndex: 0 }}>
          <KioskCharacter />
        </div>

        {/* 결제 방법 선택 화면 */}
        {showPaymentSelection && (
          <PaymentSelectionScreen
            onBack={() => setShowPaymentSelection(false)}
            onSelectCard={() => setShowPaymentProcessing(true)}
          />
        )}

        {/* 결제 진행 화면 */}
        {showPaymentProcessing && (
          <PaymentProcessingScreen
            totalAmount={calculateCartTotal()}
            onBack={() => setShowPaymentProcessing(false)}
            onComplete={() => setShowPaymentComplete(true)}
          />
        )}

        {/* 결제 완료 화면 */}
        {showPaymentComplete && (
          <PaymentCompleteScreen
            onClose={() => {
              setShowPaymentComplete(false);
              setShowPaymentProcessing(false);
              setShowPaymentSelection(false);
              setShowCart(false);
              setCartItems([]);
            }}
          />
        )}
      </div>
    </div>
  );
}
