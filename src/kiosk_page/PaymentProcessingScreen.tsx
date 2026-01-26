import { useState, useEffect } from "react";
import { StaffCallButton, KioskCharacter } from "../components/KioskComponents";
import StaffCallModal from "../components/StaffCallModal";
import backArrowCircle from "../assets/back_arrow_circle.png";

interface PaymentProcessingScreenProps {
  totalAmount: number;
  discountAmount: number;
  onBack: () => void;
  onComplete: () => void;
}

export default function PaymentProcessingScreen({ totalAmount, discountAmount, onBack, onComplete }: PaymentProcessingScreenProps) {
  const [showStaffCallModal, setShowStaffCallModal] = useState(false);

  // 3초 후 자동 완료
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#F5EDE4",
        zIndex: 30
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
      <StaffCallButton onClick={() => setShowStaffCallModal(true)} />

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
            color: discountAmount > 0 ? "#C32911" : "#888888"
          }}>-{discountAmount.toLocaleString()}원</span>
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
          }}>{(totalAmount - discountAmount).toLocaleString()}원</span>
        </div>
      </div>

      {/* 로딩 모달 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: "400px",
            backgroundColor: "#FFFFFF",
            borderRadius: "40px",
            padding: "60px",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          }}
        >
          {/* 모래시계 아이콘 */}
          <div style={{
            fontSize: "100px",
            marginBottom: "30px",
            animation: "flip 1s ease-in-out infinite"
          }}>
            ⏳
          </div>
          
          {/* 텍스트 */}
          <p
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "40px",
              fontWeight: "600",
              color: "#4A3728",
            }}
          >
            결제 진행중...
          </p>
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes flip {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(180deg); }
        }
      `}</style>

      {/* 직원 호출 모달 */}
      <StaffCallModal
        isOpen={showStaffCallModal}
        onClose={() => setShowStaffCallModal(false)}
      />
    </div>
  );
}
