import { useEffect, useState } from "react";
import { StaffCallButton, BackButton, KioskCharacter, BottomPanel } from "../components/KioskComponents";
import CategoryBar from "../components/CategoryBar";
import SpeechBubble from "../components/SpeechBubble";
import PaymentFlow from "../components/PaymentFlow";

// 뷰 컴포넌트
import MenuListView from "./views/MenuListView";
import MenuDetailView from "./views/MenuDetailView";
import SizeSelectionView from "./views/SizeSelectionView";
import IngredientChangeView from "./views/IngredientChangeView";
import CartView from "./views/CartView";
import SimpleQuantityView from "./views/SimpleQuantityView";

// 데이터 및 훅
import { menuData } from "../data/menuData";
import { useCart } from "../hooks/useCart";
import { useMenuSelection } from "../hooks/useMenuSelection";
import { usePaymentFlow } from "../hooks/usePaymentFlow";
import { CategoryType, MenuItem } from "../types/kiosk";

interface Props {
  onBack: () => void;
  onCategory: (category: string) => void;
  currentCategory: CategoryType;
  onGoToMain: () => void;
  speaking?: boolean;
  menuItems?: MenuItem[];
  sharedCart?: any;
  onProcessOrder?: (amount: number) => Promise<string | null>;
  ticketNumber?: string | null;
  onResetTicket?: () => void;
  voiceCheckoutSignal?: number;
  voiceContinueSignal?: number;
  voiceCartSignal?: number;
  voicePaymentSignal?: number;
  voicePaymentMethod?: "CARD" | "POINT" | "SIMPLE" | null;
}

export default function KioskCategoryPage({
  onBack, onCategory, currentCategory, onGoToMain, speaking,
  menuItems: fetchedMenuItems, sharedCart: cart,
  onProcessOrder, ticketNumber, onResetTicket, voiceCheckoutSignal, voiceContinueSignal, voiceCartSignal, voicePaymentSignal, voicePaymentMethod
}: Props) {
  // 페이지네이션
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;

  // 동적 데이터가 있으면 필터링해서 사용
  const menuItems = fetchedMenuItems && fetchedMenuItems.length > 0
    ? fetchedMenuItems.filter(item => {
      if (currentCategory === "all") return true;
      const cat = item.category || item.categoryId;
      // 백엔드 카테고리(cat_burger, cat_side, cat_drink 등)와 프론트엔드 카테고리 매핑
      if (cat === currentCategory) return true;

      // 백엔드 새 ID 매핑
      if (currentCategory === "burger" && cat === "cat_burger") return true;
      if (currentCategory === "side" && cat === "cat_side") return true;
      if (currentCategory === "drink" && cat === "cat_drink") return true;

      // 레거시 매핑 보완 (필요 시)
      if (currentCategory === "burger" && cat === "cat_02") return true;
      if (currentCategory === "side" && cat === "cat_03") return true;
      if (currentCategory === "drink" && cat === "cat_01") return true;

      return false;
    })
    : [];

  // 커스텀 훅
  // const cart = useCart(); // 제거: Props에서 전달받은 sharedCart 사용
  const menu = useMenuSelection();
  const payment = usePaymentFlow();

  useEffect(() => {
    if (!voiceCheckoutSignal) return;
    cart.setShowCart(true);
    payment.setShowPaymentSelection(true);
  }, [voiceCheckoutSignal]);

  useEffect(() => {
    if (!voiceCartSignal) return;
    cart.setShowCart(true);
  }, [voiceCartSignal]);

  useEffect(() => {
    if (!voiceContinueSignal) return;
    payment.resetPaymentFlow();
    menu.resetSelection();
    cart.setShowCart(false);
    setCurrentIndex(0);
  }, [voiceContinueSignal]);

  useEffect(() => {
    if (!voicePaymentSignal || !voicePaymentMethod) return;
    if (!payment.showPaymentSelection && !payment.showPaymentProcessing && !payment.showPointUsage && !payment.showSimplePayment) {
      return;
    }
    payment.setShowPaymentSelection(false);
    payment.setShowPaymentProcessing(false);
    payment.setShowPointUsage(false);
    payment.setShowSimplePayment(false);
    if (voicePaymentMethod === "CARD") payment.setShowPaymentProcessing(true);
    if (voicePaymentMethod === "POINT") payment.setShowPointUsage(true);
    if (voicePaymentMethod === "SIMPLE") payment.setShowSimplePayment(true);
  }, [voicePaymentSignal, voicePaymentMethod]);

  const isPaymentActive = payment.showPaymentSelection || payment.showPaymentProcessing ||
    payment.showPaymentComplete || payment.showPointUsage ||
    payment.showSimplePayment;

  // 버거 카테고리 체크 (단일 "burger"로 통합)
  const isBurger = currentCategory === "burger" || (menu.selectedMenu && (menu.selectedMenu.categoryId === "cat_burger" || menu.selectedMenu.categoryId === "cat_02"));

  // 카테고리 변경 시 장바구니 닫고 메뉴 리셋
  const handleCategoryChange = (category: string) => {
    cart.setShowCart(false);
    menu.resetSelection();
    setCurrentIndex(0);
    onCategory(category);
  };

  // 페이지네이션
  const handlePrev = () => setCurrentIndex(prev => Math.max(0, prev - itemsPerPage));
  const handleNext = () => setCurrentIndex(prev => Math.min(menuItems.length - itemsPerPage, prev + itemsPerPage));

  // 장바구니 추가 (버거 - 단품/세트 분리)
  const addBurgerToCart = () => {
    if (!menu.selectedMenu) return;

    // 단품 추가 (rSizeQty = 단품 수량)
    if (menu.rSizeQty > 0) {
      cart.addToCart(
        menu.selectedMenu,
        menu.rSizeQty,
        "",
        "",
        "",  // 사이즈 없음 = 단품
        menu.removedIngredients,
        false,
        menu.selectedOptions
      );
    }

    // 세트 추가 (lSizeQty = 세트 수량)
    if (menu.lSizeQty > 0) {
      cart.addToCart(
        menu.selectedMenu,
        menu.lSizeQty,
        menu.selectedSide,
        menu.selectedDrink,
        "세트",  // 사이즈에 "세트" 표시
        menu.removedIngredients,
        menu.isLargeSet,
        menu.selectedOptions
      );
    }

    menu.resetSelection();
  };

  // 장바구니 추가 (사이드/음료)
  const addSimpleToCart = () => {
    if (!menu.selectedMenu) return;
    cart.addToCart(menu.selectedMenu, menu.simpleQty, "", "", "", []);
    menu.resetSelection();
  };

  // 결제 완료
  const handlePaymentDone = () => {
    payment.resetPaymentFlow();
    if (onResetTicket) onResetTicket();
    cart.clearCart();
    onGoToMain();
  };

  const handleManualOrder = async () => {
    if (onProcessOrder) {
      const amount = cart.calculateCartTotal() - payment.usedPoints;
      await onProcessOrder(amount);
      // App.tsx에서 ticketNumber가 업데이트되면 PaymentCompleteScreen에서 이를 감지할 것
      payment.setShowPaymentProcessing(false);
      payment.setShowPaymentComplete(true);
    }
  };

  // 하단 패널 높이 계산
  const panelHeight =
    menu.showSizeSelection
      ? "900px"
      : (cart.showCart && cart.cartItems.length > 0) || menu.showIngredientChange
        ? (cart.cartExpanded || menu.showIngredientChange ? "1142px" : "550px")
        : "469px";

  // 말풍선 메시지
  const speechMessage = menu.showSizeSelection ? "사이즈를 선택해주세요"
    : menu.showIngredientChange ? "변경할 옵션을 선택해주세요"
      : menu.showSimpleQuantity ? "수량을 선택해주세요"
        : null;

  // 하단 패널 콘텐츠
  const renderBottomContent = () => {
    // 장바구니
    if (cart.showCart && cart.cartItems.length > 0) {
      return (
        <CartView
          cartItems={cart.cartItems}
          cartExpanded={cart.cartExpanded}
          onToggleExpanded={cart.toggleCartExpanded}
          onUpdateQuantity={cart.updateCartQuantity}
          onOrder={() => payment.setShowPaymentSelection(true)}
          onAddMore={() => cart.setShowCart(false)}
          calculateTotal={cart.calculateCartTotal}
        />
      );
    }

    // 재료변경
    if (menu.showIngredientChange && menu.selectedMenu) {
      return (
        <IngredientChangeView
          menu={menu.selectedMenu}
          removedIngredients={menu.removedIngredients}
          selectedOptions={menu.selectedOptions}
          selectedSide={menu.selectedSide}
          selectedDrink={menu.selectedDrink}
          isSet={menu.isSet}
          isLargeSet={menu.isLargeSet}
          lSizeQty={menu.lSizeQty}
          ingredientAccordionOpen={menu.ingredientAccordionOpen}
          setMenuAccordionOpen={menu.setMenuAccordionOpen}
          onBack={menu.handleBackFromIngredient}
          onAddToCart={addBurgerToCart}
          onToggleIngredient={menu.toggleIngredient}
          onToggleOption={menu.toggleOption}
          onToggleLargeSet={menu.toggleLargeSet}
          onSelectSide={menu.setSelectedSide}
          onSelectDrink={menu.setSelectedDrink}
          onSetIngredientAccordionOpen={menu.setIngredientAccordionOpen}
          onSetSetMenuAccordionOpen={menu.setSetMenuAccordionOpen}
          calculateTotal={menu.calculateTotal}
        />
      );
    }

    // 간단 수량선택 (사이드/음료)
    if (menu.showSimpleQuantity && menu.selectedMenu) {
      return (
        <SimpleQuantityView
          menu={menu.selectedMenu}
          quantity={menu.simpleQty}
          onBack={menu.handleBackFromSimpleQuantity}
          onAddToCart={addSimpleToCart}
          onQuantityChange={menu.setSimpleQty}
        />
      );
    }

    // 사이즈 선택 (버거 - 단품 vs 세트 선택)
    if (menu.showSizeSelection && menu.selectedMenu) {
      return (
        <SizeSelectionView
          menu={menu.selectedMenu}
          onBack={menu.handleBackFromSizeSelection}
          onSingleSelect={menu.handleSingleSelect}
          onSetSelect={menu.handleSetSelect}
        />
      );
    }

    // 메뉴 상세
    if (menu.selectedMenu && !menu.showSizeSelection && !menu.showSimpleQuantity) {
      return (
        <MenuDetailView
          menu={menu.selectedMenu}
          nutritionOpen={menu.nutritionOpen}
          allergyOpen={menu.allergyOpen}
          onBack={menu.handleBackFromDetail}
          onOrder={isBurger ? menu.handleOrderClick : menu.handleSimpleOrderClick}
          onToggleNutrition={menu.toggleNutrition}
          onToggleAllergy={menu.toggleAllergy}
        />
      );
    }

    // 메뉴 목록 (기본)
    return (
      <MenuListView
        currentCategory={currentCategory}
        menuItems={menuItems}
        currentIndex={currentIndex}
        itemsPerPage={itemsPerPage}
        onPrev={handlePrev}
        onNext={handleNext}
        onSelectMenu={menu.handleSelectMenu}
      />
    );
  };

  return (
    <div className="w-full h-full relative">
      <div style={{
        filter: isPaymentActive ? "brightness(0.5) blur(4px)" : "none",
        pointerEvents: isPaymentActive ? "none" : "auto",
        transition: "filter 0.3s ease-in-out, opacity 0.3s ease-in-out",
        width: "1080px",
        height: "1920px",
        position: "absolute",
        top: 0,
        left: 0
      }}>
        <BackButton onClick={onBack} />
        <StaffCallButton onClick={() => payment.setShowStaffCallModal(true)} />
        <CategoryBar currentCategory={currentCategory} onCategory={handleCategoryChange} />

        <BottomPanel height={panelHeight}>
          {renderBottomContent()}
        </BottomPanel>

        {speechMessage && (
          <SpeechBubble
            message={speechMessage}
            bottom={panelHeight === "469px" ? "544px" : "1200px"}
          />
        )}
      </div>

      {/* 결제 화면들 */}
      <PaymentFlow
        showPaymentSelection={payment.showPaymentSelection}
        showPaymentProcessing={payment.showPaymentProcessing}
        showPaymentComplete={payment.showPaymentComplete}
        showPointUsage={payment.showPointUsage}
        showSimplePayment={payment.showSimplePayment}
        showStaffCallModal={payment.showStaffCallModal}
        usedPoints={payment.usedPoints}
        totalAmount={cart.calculateCartTotal()}
        onClosePaymentSelection={() => payment.setShowPaymentSelection(false)}
        onSelectCard={() => {
          payment.setShowPaymentSelection(false);
          payment.setShowPaymentProcessing(true);
        }}
        onSelectPoint={() => {
          payment.setShowPaymentSelection(false);
          payment.setShowPointUsage(true);
        }}
        onSelectSimple={() => {
          payment.setShowPaymentSelection(false);
          payment.setShowSimplePayment(true);
        }}
        onClosePaymentProcessing={() => payment.setShowPaymentProcessing(false)}
        onPaymentComplete={handleManualOrder}
        onClosePointUsage={() => payment.setShowPointUsage(false)}
        onPointUsageComplete={payment.handlePointUsageComplete}
        onCloseSimplePayment={() => payment.setShowSimplePayment(false)}
        onSimplePaymentComplete={payment.handleSimplePaymentComplete}
        onPaymentDone={handlePaymentDone}
        onCloseStaffModal={() => payment.setShowStaffCallModal(false)}
        ticketNumber={ticketNumber ?? null}
      />
    </div>
  );
}
