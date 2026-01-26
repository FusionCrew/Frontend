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
import { CategoryType } from "../types/kiosk";

interface Props {
  onBack: () => void;
  onCategory: (category: string) => void;
  currentCategory: CategoryType;
  onGoToMain: () => void;
}

export default function KioskCategoryPage({ onBack, onCategory, currentCategory, onGoToMain }: Props) {
  // 페이지네이션
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;
  const menuItems = menuData[currentCategory] || [];

  // 커스텀 훅
  const cart = useCart();
  const menu = useMenuSelection();
  const payment = usePaymentFlow();

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
    cart.clearCart();
    onGoToMain();
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
    <div className="min-h-screen flex items-center justify-center bg-neutral-200">
      <div className="relative overflow-hidden" style={{ width: "1080px", height: "1920px", backgroundColor: "#F5EDE4" }}>
        <BackButton onClick={onBack} />
        <StaffCallButton onClick={() => payment.setShowStaffCallModal(true)} />
        <CategoryBar currentCategory={currentCategory} onCategory={handleCategoryChange} />
        
        <BottomPanel height={panelHeight}>
          {renderBottomContent()}
        </BottomPanel>

        {speechMessage && <SpeechBubble message={speechMessage} />}
        
        <div style={{ position: "relative", zIndex: 0 }}>
          <KioskCharacter />
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
          onSelectCard={() => payment.setShowPaymentProcessing(true)}
          onSelectPoint={() => payment.setShowPointUsage(true)}
          onSelectSimple={() => payment.setShowSimplePayment(true)}
          onClosePaymentProcessing={() => payment.setShowPaymentProcessing(false)}
          onPaymentComplete={() => payment.setShowPaymentComplete(true)}
          onClosePointUsage={() => payment.setShowPointUsage(false)}
          onPointUsageComplete={payment.handlePointUsageComplete}
          onCloseSimplePayment={() => payment.setShowSimplePayment(false)}
          onSimplePaymentComplete={payment.handleSimplePaymentComplete}
          onPaymentDone={handlePaymentDone}
          onCloseStaffModal={() => payment.setShowStaffCallModal(false)}
        />
      </div>
    </div>
  );
}
