import { StaffCallButton, BackButton, KioskCharacter, BottomPanel } from "../components/KioskComponents";
import menuBurgerSingle from "../assets/menu_burger_single.png";
import menuBurgerSet from "../assets/menu_burger_set.png";
import menuSide from "../assets/menu_side.png";
import menuDrink from "../assets/menu_drink.png";

interface KioskMenuProps {
  onBack: () => void;
  onRecommended: () => void;
  onCategory: (category: string) => void;
  speaking?: boolean;
}

export default function KioskMenu({ onBack, onRecommended, onCategory }: KioskMenuProps) {

  return (
    <div className="w-full h-full relative">
      {/* 뒤로가기 버튼 */}
      <BackButton onClick={onBack} />

      {/* 직원 호출 버튼 */}
      <StaffCallButton />

      {/* 탭 버튼들 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex"
        style={{ top: "150px", gap: "29px", zIndex: 10 }}
      >
        {/* 전체 메뉴 탭 (선택됨) */}
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
          전체 메뉴
        </button>

        {/* 추천 메뉴 탭 */}
        <button
          onClick={onRecommended}
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
          추천 메뉴
        </button>
      </div>

      {/* 하단 메뉴 패널 - BottomPanel 컴포넌트 사용 */}
      <BottomPanel>
        <div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col"
          style={{ top: "50px" }}
        >
          {/* 전체 메뉴 라벨 */}
          <p
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "34px",
              fontWeight: "500",
              color: "#4A3728",
              marginBottom: "30px"
            }}
          >
            전체 메뉴
          </p>

          {/* 카테고리 버튼들 */}
          <div className="flex" style={{ gap: "35px" }}>
            {/* 버거 단품 */}
            <button
              onClick={() => onCategory("burgerSingle")}
              className="flex flex-col items-center"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: "195px",
                  height: "178px",
                  backgroundColor: "#FDEAEA",
                  borderRadius: "24px",
                  marginBottom: "16px"
                }}
              >
                <img src={menuBurgerSingle} alt="버거 단품" style={{ width: "auto", height: "140px", objectFit: "contain" }} />
              </div>
              <span
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "40px",
                  fontWeight: "500",
                  color: "#4A3728"
                }}
              >
                버거 단품
              </span>
            </button>

            {/* 버거 세트 */}
            <button
              onClick={() => onCategory("burgerSet")}
              className="flex flex-col items-center"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: "195px",
                  height: "178px",
                  backgroundColor: "#FDEAEA",
                  borderRadius: "24px",
                  marginBottom: "16px"
                }}
              >
                <img src={menuBurgerSet} alt="버거 세트" style={{ width: "auto", height: "140px", objectFit: "contain" }} />
              </div>
              <span
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "40px",
                  fontWeight: "500",
                  color: "#4A3728"
                }}
              >
                버거 세트
              </span>
            </button>

            {/* 사이드 */}
            <button
              onClick={() => onCategory("side")}
              className="flex flex-col items-center"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: "195px",
                  height: "178px",
                  backgroundColor: "#FDEAEA",
                  borderRadius: "24px",
                  marginBottom: "16px"
                }}
              >
                <img src={menuSide} alt="사이드" style={{ width: "auto", height: "140px", objectFit: "contain" }} />
              </div>
              <span
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "40px",
                  fontWeight: "500",
                  color: "#4A3728"
                }}
              >
                사이드
              </span>
            </button>

            {/* 음료 */}
            <button
              onClick={() => onCategory("drink")}
              className="flex flex-col items-center"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: "195px",
                  height: "178px",
                  backgroundColor: "#FDEAEA",
                  borderRadius: "24px",
                  marginBottom: "16px"
                }}
              >
                <img src={menuDrink} alt="음료" style={{ width: "auto", height: "140px", objectFit: "contain" }} />
              </div>
              <span
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "40px",
                  fontWeight: "500",
                  color: "#4A3728"
                }}
              >
                음료
              </span>
            </button>
          </div>
        </div>
      </BottomPanel>

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
        메뉴 유형을 선택해주세요
      </div>
    </div>
  );
}
