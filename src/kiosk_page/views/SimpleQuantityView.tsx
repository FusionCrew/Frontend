import { MenuItem } from "../../types/kiosk";
import QuantityControl from "../../components/QuantityControl";
import backArrowCircle from "../../assets/back_arrow_circle.png";
import recommendedBurger from "../../assets/recommended_burger.png";

interface SimpleQuantityViewProps {
  menu: MenuItem;
  quantity: number;
  onBack: () => void;
  onAddToCart: () => void;
  onQuantityChange: (qty: number) => void;
}

export default function SimpleQuantityView({
  menu,
  quantity,
  onBack,
  onAddToCart,
  onQuantityChange,
}: SimpleQuantityViewProps) {
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

      {/* 장바구니에 추가 버튼 */}
      <button
        onClick={onAddToCart}
        style={{
          position: "absolute",
          top: "53px",
          right: "146px",
          width: "287px",
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
        장바구니에 추가
      </button>

      {/* 메뉴 이미지 + 수량 선택 */}
      <div
        style={{
          position: "absolute",
          top: "160px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "788px",
          display: "flex",
          alignItems: "center",
          gap: "40px",
        }}
      >
        <img
          src={recommendedBurger}
          alt={menu.name}
          style={{
            width: "140px",
            height: "140px",
            objectFit: "contain",
          }}
        />
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "30px",
              fontWeight: "500",
              color: "#4A3728",
              marginBottom: "8px",
            }}
          >
            {menu.name}
          </p>
          <p
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "30px",
              fontWeight: "500",
              color: "#C32911",
            }}
          >
            {menu.price.toLocaleString()}원
          </p>
        </div>
        <QuantityControl
          quantity={quantity}
          onDecrease={() => onQuantityChange(Math.max(1, quantity - 1))}
          onIncrease={() => onQuantityChange(quantity + 1)}
        />
      </div>

      {/* 총 가격 */}
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
        총 {(menu.price * quantity).toLocaleString()}원
      </div>
    </>
  );
}
