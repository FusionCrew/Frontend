import type { CartItem } from "../../types/kiosk";
import QuantityControl from "../../components/QuantityControl";
import recommendedBurger from "../../assets/recommended_burger.png";

interface CartViewProps {
  cartItems: CartItem[];
  cartExpanded: boolean;
  onToggleExpanded: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onOrder: () => void;
  onAddMore: () => void;
  calculateTotal: () => number;
}

export default function CartView({
  cartItems,
  cartExpanded,
  onToggleExpanded,
  onUpdateQuantity,
  onOrder,
  onAddMore,
  calculateTotal,
}: CartViewProps) {
  return (
    <>
      {/* 화살표 버튼 (위/아래 토글) */}
      <div
        onClick={onToggleExpanded}
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: "38px",
          cursor: "pointer",
        }}
      >
        <img
          src={
            cartExpanded
              ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23561D02'%3E%3Cpath d='M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'/%3E%3C/svg%3E"
              : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23561D02'%3E%3Cpath d='M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z'/%3E%3C/svg%3E"
          }
          alt={cartExpanded ? "collapse" : "expand"}
          style={{ width: "90px", height: "90px" }}
        />
      </div>

      {/* 장바구니 아이템들 - 접혀있을 때는 첫 번째만, 펼쳤을 때는 전체 */}
      <div style={{ padding: "0 80px" }}>
        {(cartExpanded ? cartItems : cartItems.slice(0, 1)).map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: index === 0 ? "20px" : "25px",
              paddingBottom: "25px",
              borderBottom: (cartExpanded && index < cartItems.length - 1) ? "1px solid #E0E0E0" : "none",
            }}
          >
            {/* 메뉴 이미지 + 정보 */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <img
                src={recommendedBurger}
                alt={item.menu.name}
                style={{
                  width: "100px",
                  height: "100px",
                  objectFit: "contain",
                }}
              />
              <div>
                <p
                  style={{
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "34px",
                    fontWeight: "600",
                    color: "#4A3728",
                    marginBottom: "4px",
                  }}
                >
                  {item.menu.name}{(item.size && !item.menu.name.includes("세트")) ? " 세트" : ""}
                </p>
                {/* 옵션 정보 - 확장 시에만 표시 */}
                {cartExpanded && (
                  <p
                    style={{
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontSize: "24px",
                      fontWeight: "400",
                      color: "#888888",
                      marginBottom: "4px",
                    }}
                  >
                    {item.size}{item.isLargeSet ? " (라지)" : ""}
                    {item.removedIngredients.length > 0
                      ? `, NO ${item.removedIngredients.join(", ")}`
                      : ""}
                    {item.drink ? `, ${item.drink}` : ""}
                    {item.selectedOptions && item.selectedOptions.length > 0
                      ? `, ${item.selectedOptions.map((o) => o.name).join(", ")}`
                      : ""}
                  </p>
                )}
                <p
                  style={{
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontSize: "30px",
                    fontWeight: "500",
                    color: "#C32911",
                  }}
                >
                  {(() => {
                    let price = item.menu.price;
                    if (item.size === "세트") {
                      price += 3000;
                      if (item.isLargeSet) price += 500;
                    }
                    const optionsPrice = item.selectedOptions?.reduce((sum, opt) => sum + opt.extraPrice, 0) || 0;
                    return ((price + optionsPrice) * item.quantity).toLocaleString();
                  })()}원
                </p>
              </div>
            </div>

            {/* 수량 조절 */}
            <QuantityControl
              quantity={item.quantity}
              onDecrease={() => onUpdateQuantity(index, -1)}
              onIncrease={() => onUpdateQuantity(index, 1)}
              variant="cart"
            />
          </div>
        ))}

        {/* 접혀있을 때 추가 아이템 개수 표시 */}
        {!cartExpanded && cartItems.length > 1 && (
          <p
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "26px",
              fontWeight: "500",
              color: "#888888",
              marginTop: "20px",
              textAlign: "center",
            }}
          >
            외 {cartItems.length - 1}개 더보기
          </p>
        )}
      </div>

      {/* 하단 버튼들 */}
      <div
        style={{
          position: "absolute",
          bottom: "60px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "20px",
          width: "920px",
        }}
      >
        {/* 더 주문하기 버튼 */}
        <button
          onClick={onAddMore}
          style={{
            width: "300px",
            height: "100px",
            backgroundColor: "#F3D4CF",
            color: "#C32911",
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "36px",
            fontWeight: "600",
            borderRadius: "50px",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          더 주문하기
        </button>

        {/* 주문하기 버튼 */}
        <button
          onClick={onOrder}
          style={{
            flex: 1,
            height: "100px",
            backgroundColor: "#C32911",
            color: "#FFFFFF",
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "36px",
            fontWeight: "600",
            borderRadius: "50px",
            border: "none",
            cursor: "pointer",
          }}
        >
          {calculateTotal().toLocaleString()}원 주문하기
        </button>
      </div>
    </>
  );
}
