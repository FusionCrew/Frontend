import type { MenuItem } from "../../types/kiosk";
import backArrowCircle from "../../assets/back_arrow_circle.png";

interface SizeSelectionViewProps {
  menu: MenuItem;
  onBack: () => void;
  onSingleSelect: () => void;
  onSetSelect: () => void;
}

export default function SizeSelectionView({
  menu,
  onBack,
  onSingleSelect,
  onSetSelect,
}: SizeSelectionViewProps) {
  // 세트 가격 (단품 + 3000원)
  const setPrice = menu.price + 3000;

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

      {/* 선택 안내 */}
      <div
        style={{
          position: "absolute",
          top: "240px",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: "44px",
          fontWeight: "700",
          color: "#4A3728",
          width: "100%"
        }}
      >
        어떤 종류로 드시겠습니까?
      </div>

      {/* 선택 버튼들 */}
      <div
        style={{
          position: "absolute",
          top: "390px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "40px"
        }}
      >
        {/* 단품 선택 */}
        <button
          onClick={onSingleSelect}
          style={{
            width: "380px",
            height: "450px",
            backgroundColor: "#FFFFFF",
            borderRadius: "32px",
            border: "2px solid #E0E0E0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            transition: "transform 0.2s ease"
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
          onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          <div style={{ fontSize: "120px", marginBottom: "20px" }}>🍔</div>
          <p style={{ fontSize: "48px", fontWeight: "700", color: "#4A3728", marginBottom: "10px" }}>단품</p>
          <p style={{ fontSize: "36px", fontWeight: "600", color: "#C32911" }}>{menu.price.toLocaleString()}원</p>
        </button>

        {/* 세트 선택 */}
        <button
          onClick={onSetSelect}
          style={{
            width: "380px",
            height: "450px",
            backgroundColor: "#C32911",
            borderRadius: "32px",
            border: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(195, 41, 17, 0.3)",
            transition: "transform 0.2s ease"
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
          onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          <div style={{ fontSize: "120px", marginBottom: "20px" }}>🍟🥤</div>
          <p style={{ fontSize: "48px", fontWeight: "700", color: "#FFFFFF", marginBottom: "10px" }}>세트</p>
          <p style={{ fontSize: "36px", fontWeight: "600", color: "#FFCE00" }}>{setPrice.toLocaleString()}원</p>
          <p style={{ fontSize: "24px", color: "#FFFFFF", marginTop: "10px", opacity: 0.9 }}>+사이드 & 음료</p>
        </button>
      </div>
    </>
  );
}
