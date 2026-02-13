import { useState, useEffect } from "react";
import { StaffCallButton } from "../components/KioskComponents";
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
  const [cancelled, setCancelled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 뒤로가기 핸들러
  const handleBack = () => {
    setCancelled(true);
    onBack();
  };

  // 단계별 결제 진행
  useEffect(() => {
    if (cancelled || isProcessing) return;

    // 1단계: 3초 동안 '카드를 삽입해주세요' 화면 유지
    const timer = setTimeout(async () => {
      if (!cancelled) {
        setIsProcessing(true); // 2단계 시작: '결제 진행중...' 모달 표시

        try {
          // 실제 결제 API 호출이 일어나는 handleManualOrder 실행
          // 이 함수 안에서 onProcessOrder가 호출되고 ticketNumber가 업데이트됨
          await onComplete();
        } catch (error) {
          console.error("Payment execution failed:", error);
          setIsProcessing(false);
          // 실패 시나리오 처리가 필요하면 여기에 추가
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete, cancelled, isProcessing]);

  return (
    <div className="fixed inset-0 w-full h-full" style={{ zIndex: 1000 }}>
      {/* 뒤로가기 버튼 */}
      <button
        onClick={handleBack}
        className="absolute flex items-center justify-center"
        style={{
          top: "45px",
          left: "44px",
          width: "80px",
          height: "80px",
          background: "none",
          border: "none",
          cursor: "pointer",
          zIndex: 1010
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
        textAlign: "center",
        zIndex: 100
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
          justifyContent: "center",
          zIndex: 110
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
      {isProcessing && (
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
            zIndex: 150,
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
      )}

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
