import { useState } from "react";
import type { MenuItem, CategoryType, SelectedOption, OptionGroup, OptionItem } from "../types/kiosk";

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
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [selectedSide, setSelectedSide] = useState("후렌치 후라이");
  const [selectedDrink, setSelectedDrink] = useState("제로 콜라");
  const [isSet, setIsSet] = useState(false);
  const [isLargeSet, setIsLargeSet] = useState(false);
  const [rSizeQty, setRSizeQty] = useState(1);
  const [lSizeQty, setLSizeQty] = useState(1);
  const [simpleQty, setSimpleQty] = useState(1);

  // 메뉴 선택
  const handleSelectMenu = (item: MenuItem) => {
    setSelectedMenu(item);
    setNutritionOpen(false);
    setAllergyOpen(false);
    setIsLargeSet(false);
    setSelectedOptions([]); // Reset options on new menu selection
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

  // 주문하기 클릭 -> 유형 선택으로 (버거용: 단품 vs 세트)
  const handleOrderClick = () => {
    setShowSizeSelection(true); // 유형 선택 화면으로 사용
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

  // 유형 선택에서 뒤로가기
  const handleBackFromSizeSelection = () => {
    setShowSizeSelection(false);
  };

  // 유형 선택 완료 (단품)
  const handleSingleSelect = () => {
    setIsSet(false);
    setShowSizeSelection(false);
    setShowIngredientChange(true);
    setIngredientAccordionOpen(true);
    setRSizeQty(1);
    setLSizeQty(0);
  };

  // 유형 선택 완료 (세트)
  const handleSetSelect = () => {
    setIsSet(true);
    setShowSizeSelection(false);
    setShowIngredientChange(true);
    setIngredientAccordionOpen(true);
    setRSizeQty(0);
    setLSizeQty(1);
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

  // 옵션 토글
  const toggleOption = (group: OptionGroup, item: OptionItem) => {
    setSelectedOptions((prev) => {
      const isSelected = prev.find((o) => o.optionItemId === item.optionItemId);
      if (isSelected) {
        return prev.filter((o) => o.optionItemId !== item.optionItemId);
      } else {
        // 중복 선택 불가능한 경우 같은 그룹의 다른 옵션 제거
        const filtered = group.isMultipleSelectionAllowed
          ? prev
          : prev.filter((o) => o.optionGroupId !== group.optionGroupId);

        return [
          ...filtered,
          {
            optionGroupId: group.optionGroupId,
            optionGroupName: group.name,
            optionItemId: item.optionItemId,
            name: item.name,
            extraPrice: item.extraPrice,
          },
        ];
      }
    });
  };

  // 라지 세트 토글
  const toggleLargeSet = () => {
    setIsLargeSet(!isLargeSet);
  };

  // 총 가격 계산
  const calculateTotal = () => {
    if (!selectedMenu) return 0;
    // 세트인 경우 3000원 추가, 라지 세트인 경우 500원 더 추가
    let basePrice = isSet ? selectedMenu.price + 3000 : selectedMenu.price;
    if (isSet && isLargeSet) basePrice += 500;

    // 옵션 가격 추가
    const optionsPrice = selectedOptions.reduce((sum, opt) => sum + opt.extraPrice, 0);

    return (basePrice + optionsPrice) * (isSet ? lSizeQty : rSizeQty);
  };

  // 선택 완료 후 상태 초기화
  const resetSelection = () => {
    setShowIngredientChange(false);
    setShowSimpleQuantity(false);
    setShowSizeSelection(false);
    setSelectedMenu(null);
    setIngredientAccordionOpen(false);
    setSetMenuAccordionOpen(false);
    setRemovedIngredients([]);
    setSelectedOptions([]);
    setIsSet(false);
    setIsLargeSet(false);
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
    isSet,
    isLargeSet,
    selectedOptions,
    rSizeQty,
    lSizeQty,
    simpleQty,

    // 세터
    setSelectedSide,
    setSelectedDrink,
    setRSizeQty,
    setLSizeQty,
    setIsLargeSet,
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
    handleSingleSelect,
    handleSetSelect,
    handleBackFromIngredient,
    handleBackFromSimpleQuantity,
    toggleIngredient,
    toggleOption,
    toggleLargeSet,
    calculateTotal,
    resetSelection,
  };
}
