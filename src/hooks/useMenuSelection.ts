import { useState } from "react";
import { MenuItem } from "../types/kiosk";

export function useMenuSelection() {
  // 선택된 메뉴
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);

  // 화면 상태
  const [showSizeSelection, setShowSizeSelection] = useState(false);
  const [showIngredientChange, setShowIngredientChange] = useState(false);
  const [showSimpleQuantity, setShowSimpleQuantity] = useState(false);

  // 아코디언 상태
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [allergyOpen, setAllergyOpen] = useState(false);
  const [ingredientAccordionOpen, setIngredientAccordionOpen] = useState(false);
  const [setMenuAccordionOpen, setSetMenuAccordionOpen] = useState(false);

  // 옵션 선택
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [selectedSide, setSelectedSide] = useState("후렌치 후라이");
  const [selectedDrink, setSelectedDrink] = useState("제로 콜라");
  const [rSizeQty, setRSizeQty] = useState(1);
  const [lSizeQty, setLSizeQty] = useState(1);
  const [simpleQty, setSimpleQty] = useState(1);

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

  // 주문하기 클릭 -> 사이즈 선택으로 (버거용)
  const handleOrderClick = () => {
    setShowSizeSelection(true);
    setRSizeQty(1);
    setLSizeQty(1);
  };

  // 주문하기 클릭 -> 간단 수량 선택으로 (사이드/음료용)
  const handleSimpleOrderClick = () => {
    setShowSimpleQuantity(true);
    setSimpleQty(1);
  };

  // 간단 수량 선택에서 뒤로가기
  const handleBackFromSimpleQuantity = () => {
    setShowSimpleQuantity(false);
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

  // 재료 토글
  const toggleIngredient = (ingredient: string) => {
    if (removedIngredients.includes(ingredient)) {
      setRemovedIngredients(removedIngredients.filter((i) => i !== ingredient));
    } else {
      setRemovedIngredients([...removedIngredients, ingredient]);
    }
  };

  // 총 가격 계산
  const calculateTotal = () => {
    if (!selectedMenu) return 0;
    return selectedMenu.price * rSizeQty + (selectedMenu.price + 500) * lSizeQty;
  };

  // 선택 완료 후 상태 초기화
  const resetSelection = () => {
    setShowIngredientChange(false);
    setShowSimpleQuantity(false);
    setSelectedMenu(null);
    setIngredientAccordionOpen(false);
    setSetMenuAccordionOpen(false);
    setRemovedIngredients([]);
  };

  return {
    // 상태
    selectedMenu,
    showSizeSelection,
    showIngredientChange,
    showSimpleQuantity,
    nutritionOpen,
    allergyOpen,
    ingredientAccordionOpen,
    setMenuAccordionOpen,
    removedIngredients,
    selectedSide,
    selectedDrink,
    rSizeQty,
    lSizeQty,
    simpleQty,

    // 세터
    setSelectedSide,
    setSelectedDrink,
    setRSizeQty,
    setLSizeQty,
    setSimpleQty,
    setIngredientAccordionOpen,
    setSetMenuAccordionOpen,

    // 핸들러
    handleSelectMenu,
    handleBackFromDetail,
    toggleNutrition,
    toggleAllergy,
    handleOrderClick,
    handleSimpleOrderClick,
    handleBackFromSizeSelection,
    handleSizeComplete,
    handleBackFromIngredient,
    handleBackFromSimpleQuantity,
    toggleIngredient,
    calculateTotal,
    resetSelection,
  };
}
