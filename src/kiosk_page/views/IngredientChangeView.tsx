import { MenuItem } from "../../types/kiosk";
import { ingredients, sideOptions, drinkOptions } from "../../data/menuData";
import backArrowCircle from "../../assets/back_arrow_circle.png";

interface IngredientChangeViewProps {
  menu: MenuItem;
  removedIngredients: string[];
  selectedSide: string;
  selectedDrink: string;
  ingredientAccordionOpen: boolean;
  setMenuAccordionOpen: boolean;
  onBack: () => void;
  onAddToCart: () => void;
  onToggleIngredient: (ingredient: string) => void;
  onSelectSide: (side: string) => void;
  onSelectDrink: (drink: string) => void;
  onSetIngredientAccordionOpen: (open: boolean) => void;
  onSetSetMenuAccordionOpen: (open: boolean) => void;
  calculateTotal: () => number;
}

export default function IngredientChangeView({
  menu,
  removedIngredients,
  selectedSide,
  selectedDrink,
  ingredientAccordionOpen,
  setMenuAccordionOpen,
  onBack,
  onAddToCart,
  onToggleIngredient,
  onSelectSide,
  onSelectDrink,
  onSetIngredientAccordionOpen,
  onSetSetMenuAccordionOpen,
  calculateTotal,
}: IngredientChangeViewProps) {
  const handleButtonClick = () => {
    if (ingredientAccordionOpen) {
      onSetIngredientAccordionOpen(false);
    } else if (setMenuAccordionOpen) {
      onSetSetMenuAccordionOpen(false);
    } else {
      onAddToCart();
    }
  };

  return (
    <>
      {/* 뒤로가기 버튼 */}
      <button
        onClick={onBack}
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
          zIndex: 5,
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
          color: "#4A3728",
        }}
      >
        {menu.name}
      </span>

      {/* 장바구니에 추가 / 선택 완료 버튼 */}
      <button
        onClick={handleButtonClick}
        style={{
          position: "absolute",
          top: "53px",
          right: "146px",
          width: ingredientAccordionOpen || setMenuAccordionOpen ? "189px" : "287px",
          height: "57px",
          backgroundColor: "#FF9B19",
          color: "#FFFFFF",
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: "26px",
          fontWeight: "600",
          borderRadius: "29px",
          border: "none",
          cursor: "pointer",
        }}
      >
        {ingredientAccordionOpen || setMenuAccordionOpen ? "선택 완료" : "장바구니에 추가"}
      </button>

      {/* 버거 재료변경 아코디언 - 세트 구성변경 아코디언 닫혔을 때만 표시 */}
      {!setMenuAccordionOpen && (
        <div
          style={{
            position: "absolute",
            top: "160px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "788px",
          }}
        >
          {/* 아코디언 헤더 */}
          <div
            onClick={() => onSetIngredientAccordionOpen(!ingredientAccordionOpen)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #E0E0E0",
              paddingBottom: "20px",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "30px",
                fontWeight: "500",
                color: "#4A3728",
              }}
            >
              버거 재료변경
            </span>
            <span
              style={{
                fontSize: "30px",
                color: "#4A3728",
              }}
            >
              {ingredientAccordionOpen ? "−" : "+"}
            </span>
          </div>

          {/* 아코디언 내용 - 재료 버튼들 */}
          {ingredientAccordionOpen && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "30px",
                paddingTop: "20px",
              }}
            >
              {ingredients.map((ingredient) => (
                <button
                  key={ingredient}
                  onClick={() => onToggleIngredient(ingredient)}
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
                    cursor: "pointer",
                  }}
                >
                  {ingredient}
                  {removedIngredients.includes(ingredient) && (
                    <span
                      style={{
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
                        justifyContent: "center",
                      }}
                    >
                      −
                    </span>
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
            width: "788px",
          }}
        >
          {/* 아코디언 헤더 */}
          <div
            onClick={() => onSetSetMenuAccordionOpen(!setMenuAccordionOpen)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #E0E0E0",
              paddingBottom: "20px",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "30px",
                fontWeight: "500",
                color: "#4A3728",
              }}
            >
              세트 구성변경
            </span>
            {!setMenuAccordionOpen ? (
              <span
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "26px",
                  fontWeight: "500",
                  color: "#C32911",
                  cursor: "pointer",
                }}
              >
                {selectedSide}, {selectedDrink}
              </span>
            ) : (
              <span
                style={{
                  fontSize: "30px",
                  color: "#4A3728",
                }}
              >
                −
              </span>
            )}
          </div>

          {/* 아코디언 내용 - 사이드/음료 선택 */}
          {setMenuAccordionOpen && (
            <div style={{ paddingTop: "20px" }}>
              {/* 사이드 옵션 */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "30px",
                  marginBottom: "30px",
                }}
              >
                {sideOptions.map((side) => (
                  <button
                    key={side}
                    onClick={() => onSelectSide(side)}
                    style={{
                      padding: "12px 20px",
                      borderRadius: "25px",
                      border: selectedSide === side ? "none" : "2px solid #C32911",
                      backgroundColor: selectedSide === side ? "#C32911" : "transparent",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontSize: "24px",
                      fontWeight: "500",
                      color: selectedSide === side ? "#FFFFFF" : "#C32911",
                      cursor: "pointer",
                    }}
                  >
                    {side}
                  </button>
                ))}
              </div>

              {/* 음료 옵션 */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "30px",
                }}
              >
                {drinkOptions.map((drink) => (
                  <button
                    key={drink}
                    onClick={() => onSelectDrink(drink)}
                    style={{
                      padding: "12px 20px",
                      borderRadius: "25px",
                      border: selectedDrink === drink ? "none" : "2px solid #C32911",
                      backgroundColor: selectedDrink === drink ? "#C32911" : "transparent",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontSize: "24px",
                      fontWeight: "500",
                      color: selectedDrink === drink ? "#FFFFFF" : "#C32911",
                      cursor: "pointer",
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
            color: "#4A3728",
          }}
        >
          총 {calculateTotal().toLocaleString()}원
        </div>
      )}
    </>
  );
}
