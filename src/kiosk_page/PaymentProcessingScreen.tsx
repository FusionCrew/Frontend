import { StaffCallButton, KioskCharacter } from "../components/KioskComponents";
import backArrowCircle from "../assets/back_arrow_circle.png";

interface PaymentProcessingScreenProps {
  totalAmount: number;
  onBack: () => void;
  onComplete: () => void;
}

export default function PaymentProcessingScreen({ totalAmount, onBack, onComplete }: PaymentProcessingScreenProps) {
  return (
    <div
      onClick={onComplete}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#F5EDE4",
        zIndex: 30,
        cursor: "pointer"
      }}
    >
      {/* 뒤로가기 버튼 */}
      <button
        onClick={(e) => { e.stopPropagation(); onBack(); }}
        className="absolute flex items-center justify-center"
        style={{ 
          top: "45px", 
          left: "44px",
          width: "80px",
          height: "80px",
          background: "none",
          border: "none",
          cursor: "pointer"
        }}
      >
        <img src={backArrowCircle} alt="뒤로가기" style={{ width: "70px", height: "70px" }} />
      </button>

      {/* 직원 호출 버튼 */}
      <StaffCallButton />

      {/* 제목 */}
      <div style={{
        position: "absolute",
        top: "193px",
        left: "50%",
        transform: "translateX(-50%)",
        textAlign: "center"
      }}>
        <p style={{
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: "56px",
          fontWeight: "600",
          color: "#4A3728",
          marginBottom: "20px"
        }}>
          카드를 삽입해주세요
        </p>
        <p style={{
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: "56px",
          fontWeight: "600",
          color: "#4A3728",
          whiteSpace: "nowrap"
        }}>
          결제가 끝날때까지 카드를 뽑지 마세요
        </p>
      </div>

      {/* 캐릭터 */}
      <div style={{ position: "relative", zIndex: 0 }}>
        <KioskCharacter />
      </div>

      {/* 결제 금액 패널 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "469px",
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: "100px",
          borderTopRightRadius: "100px",
          padding: "0 80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center"
        }}
      >
        {/* 구매 금액 */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "30px"
        }}>
          <span style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "34px",
            fontWeight: "500",
            color: "#888888"
          }}>구매 금액</span>
          <span style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "34px",
            fontWeight: "500",
            color: "#888888"
          }}>{totalAmount.toLocaleString()}원</span>
        </div>

        {/* 할인 금액 */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "40px"
        }}>
          <span style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "34px",
            fontWeight: "500",
            color: "#888888"
          }}>할인 금액</span>
          <span style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "34px",
            fontWeight: "500",
            color: "#888888"
          }}>-0원</span>
        </div>

        {/* 결제 금액 */}
        <div style={{
          display: "flex",
          justifyContent: "space-between"
        }}>
          <span style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "56px",
            fontWeight: "700",
            color: "#C32911"
          }}>결제 금액</span>
          <span style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "56px",
            fontWeight: "700",
            color: "#C32911"
          }}>{totalAmount.toLocaleString()}원</span>
        </div>
      </div>
    </div>
  );
}
