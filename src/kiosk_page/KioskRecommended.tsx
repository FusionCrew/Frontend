import { useState } from "react";
import { StaffCallButton, BackButton, KioskCharacter, BottomPanel } from "../components/KioskComponents";
import recommendedBurger from "../assets/recommended_burger.png";

interface KioskRecommendedProps {
  onBack: () => void;
}

// 추천 메뉴 데이터
const recommendedItems = [
  { id: 1, name: "통새우 와퍼", price: 6000 },
  { id: 2, name: "통새우 와퍼", price: 6000 },
  { id: 3, name: "통새우 와퍼", price: 6000 },
  { id: 4, name: "치즈버거", price: 5000 },
  { id: 5, name: "불고기버거", price: 5500 },
  { id: 6, name: "더블와퍼", price: 8000 },
];

export default function KioskRecommended({ onBack }: KioskRecommendedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - itemsPerPage));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => 
      Math.min(recommendedItems.length - itemsPerPage, prev + itemsPerPage)
    );
  };

  const visibleItems = recommendedItems.slice(currentIndex, currentIndex + itemsPerPage);

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

        {/* 탭 버튼들 */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex"
          style={{ top: "150px", gap: "29px", zIndex: 10 }}
        >
          {/* 전체 메뉴 탭 */}
          <button
            onClick={onBack}
            style={{
              width: "446px",
              height: "142px",
              borderRadius: "71px",
              backgroundColor: "#F3D4CF",
              color: "#C32911",
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "56px",
              fontWeight: "500"
            }}
          >
            전체 메뉴
          </button>

          {/* 추천 메뉴 탭 (선택됨) */}
          <button
            style={{
              width: "446px",
              height: "142px",
              borderRadius: "71px",
              backgroundColor: "#C32911",
              color: "#FFFFFF",
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "56px",
              fontWeight: "500"
            }}
          >
            추천 메뉴
          </button>
        </div>

        {/* 하단 메뉴 패널 */}
        <BottomPanel>
          {/* 추천 메뉴 라벨 - 첫번째 카드와 왼쪽 정렬 */}
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
            추천 메뉴
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

          {/* 메뉴 아이템들 - 중앙 배치 */}
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
            disabled={currentIndex >= recommendedItems.length - itemsPerPage}
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
              color: currentIndex >= recommendedItems.length - itemsPerPage ? "#ccc" : "#4A3728",
              background: "none",
              border: "none",
              cursor: currentIndex >= recommendedItems.length - itemsPerPage ? "default" : "pointer",
              zIndex: 5
            }}
          >
            ›
          </button>
        </BottomPanel>

        {/* 캐릭터 이미지 - 제일 하단 레이어 */}
        <div style={{ position: "relative", zIndex: 0 }}>
          <KioskCharacter />
        </div>

        {/* 말풍선 - 하단 패널으로부터 75px 위 */}
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
          추천 메뉴를 선택해주세요
        </div>
      </div>
    </div>
  );
}
