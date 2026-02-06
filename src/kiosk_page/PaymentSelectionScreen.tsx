import { useState } from "react";
import { StaffCallButton, KioskCharacter } from "../components/KioskComponents";
import StaffCallModal from "../components/StaffCallModal";
import backArrowCircle from "../assets/back_arrow_circle.png";
import paymentCard from "../assets/payment_card.png";
import paymentPoint from "../assets/payment_point.png";
import paymentSimple from "../assets/payment_simple.png";

interface PaymentSelectionScreenProps {
  onBack: () => void;
  onSelectCard: () => void;
  onSelectPoint: () => void;
  onSelectSimple: () => void;
}

export default function PaymentSelectionScreen({ onBack, onSelectCard, onSelectPoint, onSelectSimple }: PaymentSelectionScreenProps) {
  const [showStaffCallModal, setShowStaffCallModal] = useState(false);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#FFF9F5]" style={{ zIndex: 1000 }}>
      {/* 뒤로가기 버튼 */}
      <button
        onClick={onBack}
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

      {/* 키오스크 캐릭터 */}
      <KioskCharacter />

      {/* 제목 */}
      <h1 style={{
        position: "absolute",
        top: "236px",
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "'Noto Sans KR', sans-serif",
        fontSize: "56px",
        fontWeight: "600",
        color: "#4A3728",
        whiteSpace: "nowrap",
        zIndex: 1000
      }}>
        어떤 결제 방법을 사용하시겠어요?
      </h1>

      {/* 결제 방법 버튼들 */}
      <div
        style={{
          position: "absolute",
          bottom: "100px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "40px",
          zIndex: 1010
        }}
      >
        {/* 신용·체크카드 */}
        <button
          onClick={onSelectCard}
          className="hover:scale-105 transition-transform"
          style={{
            width: "284px",
            height: "296px",
            backgroundColor: "#F8E8E6",
            borderRadius: "30px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px"
          }}
        >
          <img src={paymentCard} alt="신용·체크카드" style={{ width: "120px", height: "auto" }} />
          <span style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "34px",
            fontWeight: "600",
            color: "#C32911"
          }}>신용·체크카드</span>
        </button>

        {/* 포인트 사용 */}
        <button
          onClick={onSelectPoint}
          className="hover:scale-105 transition-transform"
          style={{
            width: "284px",
            height: "296px",
            backgroundColor: "#F8E8E6",
            borderRadius: "30px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px"
          }}
        >
          <img src={paymentPoint} alt="포인트 사용" style={{ width: "120px", height: "auto" }} />
          <span style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "34px",
            fontWeight: "600",
            color: "#C32911"
          }}>포인트 사용</span>
        </button>

        {/* 간편 결제 */}
        <button
          onClick={onSelectSimple}
          className="hover:scale-105 transition-transform"
          style={{
            width: "284px",
            height: "296px",
            backgroundColor: "#F8E8E6",
            borderRadius: "30px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px"
          }}
        >
          <img src={paymentSimple} alt="간편 결제" style={{ width: "120px", height: "auto" }} />
          <span style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "34px",
            fontWeight: "600",
            color: "#C32911"
          }}>간편 결제</span>
        </button>
      </div>

      {/* 직원 호출 모달 */}
      <StaffCallModal
        isOpen={showStaffCallModal}
        onClose={() => setShowStaffCallModal(false)}
      />
    </div>
  );
}
