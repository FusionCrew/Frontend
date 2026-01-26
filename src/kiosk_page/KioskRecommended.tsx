import { useState } from "react";
import { StaffCallButton, BackButton, KioskCharacter, BottomPanel } from "../components/KioskComponents";
import SpeechBubble from "../components/SpeechBubble";
import PaymentFlow from "../components/PaymentFlow";
import recommendedBurger from "../assets/recommended_burger.png";

// 뷰 컴포넌트
import MenuDetailView from "./views/MenuDetailView";
import SizeSelectionView from "./views/SizeSelectionView";
import IngredientChangeView from "./views/IngredientChangeView";
import CartView from "./views/CartView";

// 훅
import { useCart } from "../hooks/useCart";
import { useMenuSelection } from "../hooks/useMenuSelection";
import { usePaymentFlow } from "../hooks/usePaymentFlow";
import { MenuItem } from "../types/kiosk";

interface Props {
  onBack: () => void;
  onGoToMain: () => void;
}

// 추천 메뉴 데이터
const recommendedItems: MenuItem[] = [
  { id: 1, name: "통새우 와퍼", price: 6000, ingredients: ["양상추", "토마토", "피클", "양파", "새우패티"] },
  { id: 2, name: "콰트로치즈와퍼", price: 6500, ingredients: ["양상추", "토마토", "피클", "양파", "치즈", "소고기패티"] },
  { id: 3, name: "불고기버거", price: 5500, ingredients: ["양상추", "불고기", "마요네즈"] },
  { id: 4, name: "치즈버거", price: 5000, ingredients: ["양상추", "토마토", "피클", "치즈", "소고기패티"] },
  { id: 5, name: "더블와퍼", price: 8000, ingredients: ["양상추", "토마토", "피클", "양파", "소고기패티x2"] },
  { id: 6, name: "베이컨와퍼", price: 7000, ingredients: ["양상추", "토마토", "피클", "양파", "베이컨", "소고기패티"] },
];

export default function KioskRecommended({ onBack, onGoToMain }: Props) {
  // 페이지네이션
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;
  const visibleItems = recommendedItems.slice(currentIndex, currentIndex + itemsPerPage);

  // 훅
  const cart = useCart();
  const menu = useMenuSelection();
  const payment = usePaymentFlow();

  // 페이지네이션
  const handlePrev = () => setCurrentIndex(prev => Math.max(0, prev - itemsPerPage));
  const handleNext = () => setCurrentIndex(prev => Math.min(recommendedItems.length - itemsPerPage, prev + itemsPerPage));

  // 장바구니 추가
  const addToCart = () => {
    if (!menu.selectedMenu) return;
    cart.addToCart(
      menu.selectedMenu,
      menu.rSizeQty + menu.lSizeQty,
      menu.selectedSide,
      menu.selectedDrink,
      menu.rSizeQty > 0 ? "R" : "L",
      menu.removedIngredients
    );
    menu.resetSelection();
  };

  // 결제 완료
  const handlePaymentDone = () => {
    payment.resetPaymentFlow();
    cart.clearCart();
    onGoToMain();
  };

  // 패널 높이
  const panelHeight = cart.showCart && cart.cartItems.length > 0 
    ? (cart.cartExpanded ? "1142px" : "550px") 
    : "469px";

  // 말풍선 메시지
  const speechMessage = menu.showSizeSelection ? "사이즈를 선택해주세요"
    : menu.showIngredientChange ? "변경할 옵션을 선택해주세요"
    : !menu.selectedMenu ? "추천 메뉴를 선택해주세요"
    : null;

  // 하단 패널 콘텐츠
  const renderContent = () => {
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
          onAddToCart={addToCart}
          onToggleIngredient={menu.toggleIngredient}
          onSelectSide={menu.setSelectedSide}
          onSelectDrink={menu.setSelectedDrink}
          onSetIngredientAccordionOpen={menu.setIngredientAccordionOpen}
          onSetSetMenuAccordionOpen={menu.setSetMenuAccordionOpen}
          calculateTotal={menu.calculateTotal}
        />
      );
    }

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

    if (menu.selectedMenu && !menu.showSizeSelection) {
      return (
        <MenuDetailView
          menu={menu.selectedMenu}
          nutritionOpen={menu.nutritionOpen}
          allergyOpen={menu.allergyOpen}
          onBack={menu.handleBackFromDetail}
          onOrder={menu.handleOrderClick}
          onToggleNutrition={menu.toggleNutrition}
          onToggleAllergy={menu.toggleAllergy}
        />
      );
    }

    // 메뉴 목록
    return (
      <>
        <p className="absolute left-1/2" style={{ top: "50px", transform: "translateX(-50%)", width: "850px", fontFamily: "'Noto Sans KR', sans-serif", fontSize: "34px", fontWeight: "500", color: "#4A3728" }}>
          추천 메뉴
        </p>

        <button onClick={handlePrev} disabled={currentIndex === 0} style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", fontSize: "100px", color: currentIndex === 0 ? "#ccc" : "#4A3728", background: "none", border: "none", cursor: currentIndex === 0 ? "default" : "pointer" }}>‹</button>

        <div className="absolute left-1/2 -translate-x-1/2 flex" style={{ top: "120px", gap: "25px" }}>
          {visibleItems.map(item => (
            <button key={item.id} onClick={() => menu.handleSelectMenu(item)} className="flex flex-col items-center" style={{ width: "260px", backgroundColor: "#FAFAFA", borderRadius: "24px", padding: "20px", border: "none", cursor: "pointer" }}>
              <img src={recommendedBurger} alt={item.name} style={{ width: "140px", marginBottom: "16px" }} />
              <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: "32px", fontWeight: "500", color: "#4A3728", marginBottom: "8px" }}>{item.name}</span>
              <span style={{ fontFamily: "'Noto Sans KR', sans-serif", fontSize: "32px", fontWeight: "700", color: "#C32911" }}>{item.price.toLocaleString()}원</span>
            </button>
          ))}
        </div>

        <button onClick={handleNext} disabled={currentIndex >= recommendedItems.length - itemsPerPage} style={{ position: "absolute", right: "20px", top: "50%", transform: "translateY(-50%)", fontSize: "100px", color: currentIndex >= recommendedItems.length - itemsPerPage ? "#ccc" : "#4A3728", background: "none", border: "none", cursor: currentIndex >= recommendedItems.length - itemsPerPage ? "default" : "pointer" }}>›</button>
      </>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-200">
      <div className="relative overflow-hidden" style={{ width: "1080px", height: "1920px", backgroundColor: "#F5EDE4" }}>
        <BackButton onClick={onBack} />
        <StaffCallButton onClick={() => payment.setShowStaffCallModal(true)} />

        {/* 탭 */}
        <div className="absolute left-1/2 -translate-x-1/2 flex" style={{ top: "150px", gap: "29px", zIndex: 10 }}>
          <button onClick={onBack} style={{ width: "446px", height: "142px", borderRadius: "71px", backgroundColor: "#F3D4CF", color: "#C32911", fontFamily: "'Noto Sans KR', sans-serif", fontSize: "56px", fontWeight: "500" }}>전체 메뉴</button>
          <button style={{ width: "446px", height: "142px", borderRadius: "71px", backgroundColor: "#C32911", color: "#FFFFFF", fontFamily: "'Noto Sans KR', sans-serif", fontSize: "56px", fontWeight: "500" }}>추천 메뉴</button>
        </div>

        <BottomPanel height={panelHeight}>{renderContent()}</BottomPanel>
        {speechMessage && <SpeechBubble message={speechMessage} />}
        <div style={{ position: "relative", zIndex: 0 }}><KioskCharacter /></div>

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
