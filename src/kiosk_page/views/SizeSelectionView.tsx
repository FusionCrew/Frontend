import { MenuItem } from "../../types/kiosk";
import QuantityControl from "../../components/QuantityControl";
import backArrowCircle from "../../assets/back_arrow_circle.png";

interface SizeSelectionViewProps {
  menu: MenuItem;
  rSizeQty: number;  // 단품 수량
  lSizeQty: number;  // 세트 수량
  onBack: () => void;
  onComplete: () => void;
  onRSizeChange: (qty: number) => void;
  onLSizeChange: (qty: number) => void;
}

export default function SizeSelectionView({
  menu,
  rSizeQty,
  lSizeQty,
  onBack,
  onComplete,
  onRSizeChange,
  onLSizeChange,
}: SizeSelectionViewProps) {
  // 세트 가격 (단품 + 3000원)
  const setPrice = menu.price + 3000;
  
  // 총 수량 체크 (최소 1개 이상 필요)
  const totalQty = rSizeQty + lSizeQty;
  const canComplete = totalQty >= 1;

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

      {/* 선택 완료 버튼 */}
      <button
        onClick={onComplete}
        disabled={!canComplete}
        style={{
          position: "absolute",
          top: "53px",
          right: "146px",
          width: "189px",
          height: "57px",
          backgroundColor: canComplete ? "#E8A756" : "#CCCCCC",
          color: "#FFFFFF",
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: "30px",
          fontWeight: "600",
          borderRadius: "29px",
          border: "none",
          cursor: canComplete ? "pointer" : "default",
        }}
      >
        선택 완료
      </button>

      {/* 단품 선택 */}
      <div
        style={{
          position: "absolute",
          top: "160px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "788px",
          borderBottom: "1px solid #E0E0E0",
          paddingBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "30px",
              fontWeight: "500",
              color: "#4A3728",
              marginBottom: "8px",
            }}
          >
            단품
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
          quantity={rSizeQty}
          onDecrease={() => onRSizeChange(Math.max(0, rSizeQty - 1))}
          onIncrease={() => onRSizeChange(rSizeQty + 1)}
        />
      </div>

      {/* 세트 선택 */}
      <div
        style={{
          position: "absolute",
          top: "310px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "788px",
          borderBottom: "1px solid #E0E0E0",
          paddingBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "30px",
              fontWeight: "500",
              color: "#4A3728",
              marginBottom: "8px",
            }}
          >
            세트 <span style={{ fontSize: "24px", color: "#888888" }}>(+사이드/음료)</span>
          </p>
          <p
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "30px",
              fontWeight: "500",
              color: "#C32911",
            }}
          >
            {setPrice.toLocaleString()}원
          </p>
        </div>
        <QuantityControl
          quantity={lSizeQty}
          onDecrease={() => onLSizeChange(Math.max(0, lSizeQty - 1))}
          onIncrease={() => onLSizeChange(lSizeQty + 1)}
        />
      </div>
    </>
  );
}
