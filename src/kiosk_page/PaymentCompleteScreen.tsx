import { useMemo, useState } from "react";
import { StaffCallButton, KioskCharacter } from "../components/KioskComponents";
import StaffCallModal from "../components/StaffCallModal";
import backArrowCircle from "../assets/back_arrow_circle.png";

interface PaymentCompleteScreenProps {
  onClose: () => void;
  ticketNumber?: string | null;
}

export default function PaymentCompleteScreen({ onClose, ticketNumber }: PaymentCompleteScreenProps) {
  const [showStaffCallModal, setShowStaffCallModal] = useState(false);
  // 랜덤 대기번호 생성 (백업용)
  const randomOrderNumber = useMemo(() => Math.floor(Math.random() * 900) + 100, []);

  console.log("[PaymentCompleteScreen] ticketNumber:", ticketNumber);
  const displayOrderNumber = ticketNumber || randomOrderNumber;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 w-full h-full cursor-pointer"
      style={{ zIndex: 1000 }}
    >
      {/* 뒤로가기 버튼 */}
      <button
        onClick={onClose}
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
          결제가 완료되었습니다
        </p>
        <p style={{
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: "56px",
          fontWeight: "600",
          color: "#4A3728",
          whiteSpace: "nowrap"
        }}>
          카드를 꼭 회수하세요
        </p>
      </div>

      {/* 대기번호 패널 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "350px",
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: "100px",
          borderTopRightRadius: "100px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 110
        }}
      >
        <span style={{
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: "56px",
          fontWeight: "500",
          color: "#4A3728",
          marginBottom: "20px"
        }}>대기번호</span>
        <span style={{
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: "120px",
          fontWeight: "700",
          color: "#C32911"
        }}>{displayOrderNumber}</span>
      </div>

      {/* 직원 호출 모달 */}
      <StaffCallModal
        isOpen={showStaffCallModal}
        onClose={() => setShowStaffCallModal(false)}
      />
    </div>
  );
}
