import { useState } from "react";
import { StaffCallButton, KioskCharacter, BottomPanel } from "../components/KioskComponents";
import StaffCallModal from "../components/StaffCallModal";
import backArrowCircle from "../assets/back_arrow_circle.png";

interface SimplePaymentScreenProps {
  onBack: () => void;
  onComplete: () => void;
  totalAmount: number;
}

export default function SimplePaymentScreen({ onBack, onComplete, totalAmount }: SimplePaymentScreenProps) {
  const [showStaffCallModal, setShowStaffCallModal] = useState(false);

  return (
    <div
      onClick={onComplete}
      className="fixed inset-0"
      style={{
        zIndex: 1000,
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
      <StaffCallButton onClick={() => setShowStaffCallModal(true)} />

      {/* 제목 */}
      <h1 style={{
        position: "absolute",
        top: "200px",
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "'Noto Sans KR', sans-serif",
        fontSize: "48px",
        fontWeight: "600",
        color: "#4A3728",
        whiteSpace: "nowrap",
        textAlign: "center"
      }}>
        바코드를 스캔해주세요
      </h1>

      {/* 하단 패널 */}
      <BottomPanel height="550px">
        <div style={{ padding: "50px 80px", textAlign: "center" }}>
          {/* 바코드 스캔 영역 */}
          <div style={{
            width: "400px",
            height: "200px",
            margin: "0 auto 40px",
            border: "4px dashed #C32911",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FDEAEA"
          }}>
            {/* 바코드 아이콘 */}
            <div style={{
              display: "flex",
              gap: "6px",
              marginBottom: "20px"
            }}>
              {[40, 60, 30, 50, 35, 55, 40, 60, 35].map((h, i) => (
                <div key={i} style={{
                  width: "8px",
                  height: `${h}px`,
                  backgroundColor: "#4A3728",
                  borderRadius: "2px"
                }} />
              ))}
            </div>
            <span style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "28px",
              fontWeight: "500",
              color: "#C32911"
            }}>스캔 대기중...</span>
          </div>

          {/* 안내 문구 */}
          <p style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "32px",
            fontWeight: "500",
            color: "#888888",
            marginBottom: "30px"
          }}>
            카카오페이, 네이버페이, 삼성페이 등
          </p>

          {/* 결제 금액 */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px"
          }}>
            <span style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "40px",
              fontWeight: "600",
              color: "#4A3728"
            }}>결제 금액</span>
            <span style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "48px",
              fontWeight: "700",
              color: "#C32911"
            }}>{totalAmount.toLocaleString()}원</span>
          </div>
        </div>
      </BottomPanel>

      {/* 직원 호출 모달 */}
      <StaffCallModal
        isOpen={showStaffCallModal}
        onClose={() => setShowStaffCallModal(false)}
      />
    </div>
  );
}
