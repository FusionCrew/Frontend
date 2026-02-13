import type { MenuItem, SelectedOption, OptionGroup, OptionItem } from "../../types/kiosk";
import { sideOptions, drinkOptions } from "../../data/menuData";
import backArrowCircle from "../../assets/back_arrow_circle.png";

interface IngredientChangeViewProps {
  menu: MenuItem;
  removedIngredients: string[];
  selectedOptions: SelectedOption[];
  selectedSide: string;
  selectedDrink: string;
  isSet: boolean;
  isLargeSet: boolean;
  lSizeQty: number;
  ingredientAccordionOpen: boolean;
  setMenuAccordionOpen: boolean;
  onBack: () => void;
  onAddToCart: () => void;
  onToggleIngredient: (ingredient: string) => void;
  onToggleOption: (group: OptionGroup, item: OptionItem) => void;
  onToggleLargeSet: () => void;
  onSelectSide: (side: string) => void;
  onSelectDrink: (drink: string) => void;
  onSetIngredientAccordionOpen: (open: boolean) => void;
  onSetSetMenuAccordionOpen: (open: boolean) => void;
  calculateTotal: () => number;
}

export default function IngredientChangeView({
  menu,
  removedIngredients,
  selectedOptions,
  selectedSide,
  selectedDrink,
  isSet,
  isLargeSet,
  lSizeQty,
  ingredientAccordionOpen,
  setMenuAccordionOpen,
  onBack,
  onAddToCart,
  onToggleIngredient,
  onToggleOption,
  onToggleLargeSet,
  onSelectSide,
  onSelectDrink,
  onSetIngredientAccordionOpen,
  onSetSetMenuAccordionOpen,
  calculateTotal,
}: IngredientChangeViewProps) {
  const handleButtonClick = () => {
    if (ingredientAccordionOpen) {
      onSetIngredientAccordionOpen(false);
      // 세트라면 재료 선택 후 바로 구성변경 열어주기 (순차적 흐름)
      if (isSet || (menu.categoryId === "cat_02" && lSizeQty > 0)) {
        onSetSetMenuAccordionOpen(true);
      }
    } else if (setMenuAccordionOpen) {
      onSetSetMenuAccordionOpen(false);
    } else {
      onAddToCart();
    }
  };

  const isSetMenu = isSet || (menu.categoryId === "cat_02" && lSizeQty > 0);
  const buttonTextContent = ingredientAccordionOpen
    ? (isSetMenu ? "다음으로" : "선택 완료")
    : (setMenuAccordionOpen ? "선택 완료" : "장바구니에 추가");

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
        {buttonTextContent}
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
            <div style={{
              paddingTop: "20px",
              maxHeight: "750px",
              overflowY: "auto",
              paddingRight: "10px"
            }}>
              {/* 기본 재료 제외 옵션 */}
              {menu.ingredients && menu.ingredients.length > 0 && (
                <div style={{ marginBottom: "40px" }}>
                  <p
                    style={{
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontSize: "24px",
                      fontWeight: "600",
                      color: "#888",
                      marginBottom: "16px",
                    }}
                  >
                    제외할 재료 (기본 선택)
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                    {menu.ingredients.map((ingredient) => (
                      <button
                        key={ingredient}
                        onClick={() => onToggleIngredient(ingredient)}
                        style={{
                          position: "relative",
                          padding: "12px 24px",
                          borderRadius: "30px",
                          border: "none",
                          backgroundColor: removedIngredients.includes(ingredient) ? "#C32911" : "#FDEAEA",
                          fontFamily: "'Noto Sans KR', sans-serif",
                          fontSize: "24px",
                          fontWeight: "500",
                          color: removedIngredients.includes(ingredient) ? "#FFFFFF" : "#C32911",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {ingredient}
                        {removedIngredients.includes(ingredient) && (
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "20px",
                            }}
                          >
                            ✕
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 추가 옵션 그룹들 (토핑 추가 등) */}
              {menu.optionGroups?.map((group) => (
                <div key={group.optionGroupId} style={{ marginBottom: "40px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <p
                      style={{
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "#4A3728",
                      }}
                    >
                      {group.name}
                    </p>
                    {group.isRequired && (
                      <span
                        style={{
                          fontSize: "18px",
                          color: "#C32911",
                          backgroundColor: "#FDEAEA",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: "600",
                        }}
                      >
                        필수
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                    {group.optionItems.map((item) => {
                      const isSelected = selectedOptions.some((o) => o.optionItemId === item.optionItemId);
                      return (
                        <button
                          key={item.optionItemId}
                          onClick={() => onToggleOption(group, item)}
                          style={{
                            padding: "12px 24px",
                            borderRadius: "16px",
                            border: isSelected ? "2px solid #C32911" : "2px solid #E0E0E0",
                            backgroundColor: isSelected ? "#FDEAEA" : "#FFFFFF",
                            fontFamily: "'Noto Sans KR', sans-serif",
                            fontSize: "22px",
                            fontWeight: isSelected ? "600" : "500",
                            color: isSelected ? "#C32911" : "#4A3728",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            minWidth: "140px",
                          }}
                        >
                          <span>{item.name}</span>
                          <span
                            style={{
                              fontSize: "18px",
                              color: isSelected ? "#C32911" : "#888",
                              marginTop: "4px",
                            }}
                          >
                            +{item.extraPrice.toLocaleString()}원
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 세트 구성변경 아코디언 */}
      {!ingredientAccordionOpen && isSet && (
        <div
          style={{
            position: "absolute",
            top: setMenuAccordionOpen ? "140px" : "270px",
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
                      borderRadius: "16px",
                      border: drink === selectedDrink ? "2px solid #C32911" : "2px solid #E0E0E0",
                      backgroundColor: drink === selectedDrink ? "#FDEAEA" : "#FFFFFF",
                      color: drink === selectedDrink ? "#C32911" : "#4A3728",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontSize: "24px",
                      fontWeight: drink === selectedDrink ? "600" : "400",
                      cursor: "pointer",
                    }}
                  >
                    {drink}
                  </button>
                ))}
              </div>

              {/* 라지 세트 업그레이드 (사이드 업) */}
              <div
                style={{
                  marginTop: "10px",
                  padding: "20px",
                  borderRadius: "24px",
                  backgroundColor: isLargeSet ? "#FDEAEA" : "#F8F8F8",
                  border: isLargeSet ? "2px solid #C32911" : "2px solid transparent",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onClick={onToggleLargeSet}
              >
                <div>
                  <p style={{ fontSize: "28px", fontWeight: "700", color: isLargeSet ? "#C32911" : "#4A3728" }}>
                    🍟⬆️ 라지 세트로 업그레이드 하시겠습니까?
                  </p>
                  <p style={{ fontSize: "20px", color: "#888", marginTop: "4px" }}>
                    후렌치 후라이와 음료가 더 커집니다 (+500원)
                  </p>
                </div>
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    backgroundColor: isLargeSet ? "#C32911" : "#E0E0E0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "30px",
                    color: "#FFFFFF"
                  }}
                >
                  {isLargeSet ? "✓" : ""}
                </div>
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
