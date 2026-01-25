import { useState } from "react";
import { StaffCallButton, BackButton, KioskCharacter, BottomPanel } from "../components/KioskComponents";
import menuBurgerSingle from "../assets/menu_burger_single.png";
import menuBurgerSet from "../assets/menu_burger_set.png";
import menuSide from "../assets/menu_side.png";
import menuDrink from "../assets/menu_drink.png";
import recommendedBurger from "../assets/recommended_burger.png";

interface KioskBurgerSingleProps {
  onBack: () => void;
  onCategory: (category: string) => void;
}

// 버거 단품 메뉴 데이터
const burgerItems = [
  { id: 1, name: "통새우 와퍼", price: 6000 },
  { id: 2, name: "통새우 와퍼", price: 6000 },
  { id: 3, name: "통새우 와퍼", price: 6000 },
  { id: 4, name: "치즈버거", price: 5000 },
  { id: 5, name: "불고기버거", price: 5500 },
  { id: 6, name: "더블와퍼", price: 8000 },
];

// 카테고리 데이터
const categories = [
  { id: "burgerSingle", name: "버거 단품", image: menuBurgerSingle },
  { id: "burgerSet", name: "버거 세트", image: menuBurgerSet },
  { id: "side", name: "사이드", image: menuSide },
  { id: "drink", name: "음료", image: menuDrink },
];

export default function KioskBurgerSingle({ onBack, onCategory }: KioskBurgerSingleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - itemsPerPage));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => 
      Math.min(burgerItems.length - itemsPerPage, prev + itemsPerPage)
    );
  };

  const visibleItems = burgerItems.slice(currentIndex, currentIndex + itemsPerPage);

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

        {/* 상단 카테고리 바 */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
          style={{ 
            top: "147px",
            width: "918px",
            height: "215px",
            backgroundColor: "#FFFFFF",
            borderRadius: "40px",
            gap: "25px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            zIndex: 10
          }}
        >
          {/* 왼쪽 화살표 */}
          <button
            style={{
              fontSize: "120px",
              lineHeight: "1",
              color: "#4A3728",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0"
            }}
          >
            ‹
          </button>

          {/* 카테고리 아이템들 */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategory(cat.id)}
              className="flex flex-col items-center"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0"
              }}
            >
              <div
                style={{
                  width: "140px",
                  height: "125px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "20px",
                  backgroundColor: "#FDEAEA",
                  border: cat.id === "burgerSingle" ? "3px solid #C32911" : "3px solid transparent",
                  marginBottom: "8px"
                }}
              >
                <img 
                  src={cat.image} 
                  alt={cat.name} 
                  style={{ width: "90px", height: "90px", objectFit: "contain" }}
                />
              </div>
              <span
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "28px",
                  fontWeight: "500",
                  color: "#4A3728"
                }}
              >
                {cat.name}
              </span>
            </button>
          ))}

          {/* 오른쪽 화살표 */}
          <button
            style={{
              fontSize: "120px",
              lineHeight: "1",
              color: "#4A3728",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0"
            }}
          >
            ›
          </button>
        </div>

        {/* 하단 메뉴 패널 */}
        <BottomPanel>
          {/* 버거 단품 라벨 */}
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
            버거 단품
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
              <div 
                key={item.id}
                className="flex flex-col items-center"
                style={{
                  width: "260px",
                  backgroundColor: "#FAFAFA",
                  borderRadius: "24px",
                  padding: "20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                }}
              >
                {/* 버거 이미지 */}
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
              </div>
            ))}
          </div>

          {/* 오른쪽 화살표 */}
          <button
            onClick={handleNext}
            disabled={currentIndex >= burgerItems.length - itemsPerPage}
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
              color: currentIndex >= burgerItems.length - itemsPerPage ? "#ccc" : "#4A3728",
              background: "none",
              border: "none",
              cursor: currentIndex >= burgerItems.length - itemsPerPage ? "default" : "pointer",
              zIndex: 5
            }}
          >
            ›
          </button>
        </BottomPanel>

        {/* 캐릭터 이미지 */}
        <div style={{ position: "relative", zIndex: 0 }}>
          <KioskCharacter />
        </div>
      </div>
    </div>
  );
}
