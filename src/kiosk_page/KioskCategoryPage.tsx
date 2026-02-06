import { useState } from "react";
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
}

export default function KioskCategoryPage({
  onBack, onCategory, currentCategory, onGoToMain, speaking,
  menuItems: fetchedMenuItems, sharedCart: cart,
  onProcessOrder, ticketNumber, onResetTicket
}: Props) {
  // 페이지네이션
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;

  // 동적 데이터가 있으면 필터링해서 사용
  const menuItems = fetchedMenuItems && fetchedMenuItems.length > 0
    ? fetchedMenuItems.filter(item => {
      const cat = item.category || item.categoryId;
      // 백엔드 카테고리(cat_01, cat_02 등)와 프론트엔드 카테고리 매핑
      if (cat === currentCategory) return true;

      // 백엔드 매핑 (cat_02 -> 버거, cat_03 -> 사이드, cat_01 -> 음료)
      if (currentCategory === "burgerSingle" && cat === "cat_02") return true;
      if (currentCategory === "burgerSet" && cat === "cat_02") return true;
      if (currentCategory === "side" && cat === "cat_03") return true;
      if (currentCategory === "drink" && (cat === "cat_01" || cat === "cat_03")) return true;

      return false;
    })
    : [];

  // 커스텀 훅
  // const cart = useCart(); // 제거: Props에서 전달받은 sharedCart 사용
  const menu = useMenuSelection();
  const payment = usePaymentFlow();

  const isPaymentActive = payment.showPaymentSelection || payment.showPaymentProcessing ||
    payment.showPaymentComplete || payment.showPointUsage ||
    payment.showSimplePayment;

  // 버거 카테고리 체크
  const isBurger = currentCategory === "burgerSingle" || currentCategory === "burgerSet";

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
        menu.removedIngredients
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
        menu.removedIngredients
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
  const panelHeight = cart.showCart && cart.cartItems.length > 0
    ? (cart.cartExpanded ? "1142px" : "550px")
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
          selectedSide={menu.selectedSide}
          selectedDrink={menu.selectedDrink}
          ingredientAccordionOpen={menu.ingredientAccordionOpen}
          setMenuAccordionOpen={menu.setMenuAccordionOpen}
          onBack={menu.handleBackFromIngredient}
          onAddToCart={addBurgerToCart}
          onToggleIngredient={menu.toggleIngredient}
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

    // 사이즈 선택 (버거)
    if (menu.showSizeSelection && menu.selectedMenu) {
      return (
        <SizeSelectionView
          menu={menu.selectedMenu}
          rSizeQty={menu.rSizeQty}
          lSizeQty={menu.lSizeQty}
          onBack={menu.handleBackFromSizeSelection}
          onComplete={menu.handleSizeComplete}
          onRSizeChange={menu.setRSizeQty}
          onLSizeChange={menu.setLSizeQty}
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

        {speechMessage && <SpeechBubble message={speechMessage} />}
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
