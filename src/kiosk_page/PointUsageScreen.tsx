import { useState } from "react";
import { StaffCallButton, KioskCharacter, BottomPanel } from "../components/KioskComponents";
import StaffCallModal from "../components/StaffCallModal";
import backArrowCircle from "../assets/back_arrow_circle.png";

interface PointUsageScreenProps {
  onBack: () => void;
  onComplete: (pointsUsed: number) => void;
  totalAmount: number;
}

export default function PointUsageScreen({ onBack, onComplete, totalAmount }: PointUsageScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [useAllPoints, setUseAllPoints] = useState(false);
  const [showStaffCallModal, setShowStaffCallModal] = useState(false);

  // 키패드 버튼 클릭
  const handleKeyPress = (key: string) => {
    if (key === "back") {
      setPhoneNumber(prev => prev.slice(0, -1));
    } else if (phoneNumber.length < 11) {
      setPhoneNumber(prev => prev + key);
    }
  };

  // 전화번호 확인
  const handleVerify = () => {
    if (phoneNumber.length === 11) {
      // 더미 포인트 데이터 (실제로는 API 호출)
      setAvailablePoints(5000);
      setIsVerified(true);
    }
  };

  // 포인트 사용 완료
  const handleUsePoints = () => {
    const pointsToUse = useAllPoints ? Math.min(availablePoints, totalAmount) : 0;
    onComplete(pointsToUse);
  };

  // 전화번호 포맷팅 (010-1234-5678)
  const formatPhoneNumber = (num: string) => {
    if (num.length <= 3) return num;
    if (num.length <= 7) return `${num.slice(0, 3)}-${num.slice(3)}`;
    return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7)}`;
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#F5EDE4",
        zIndex: 20
      }}
    >
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
        {isVerified ? "포인트 사용" : "전화번호를 입력해주세요"}
      </h1>

      {/* 캐릭터 - 항상 표시 */}
      <div style={{ position: "relative", zIndex: 0 }}>
        <KioskCharacter />
      </div>

      {/* 하단 패널 */}
      <BottomPanel height={isVerified ? "550px" : "650px"}>
        {!isVerified ? (
          /* 전화번호 입력 화면 */
          <div style={{ padding: "40px 80px" }}>
            {/* 전화번호 표시 */}
            <div style={{
              width: "100%",
              height: "80px",
              backgroundColor: "#F5F5F5",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "40px",
              fontWeight: "500",
              color: phoneNumber ? "#4A3728" : "#CCCCCC",
              letterSpacing: "4px",
              marginBottom: "30px"
            }}>
              {formatPhoneNumber(phoneNumber) || "010-0000-0000"}
            </div>

            {/* 키패드 */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "15px",
              marginBottom: "30px"
            }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((key, index) => (
                key ? (
                  <button
                    key={index}
                    onClick={() => handleKeyPress(key)}
                    style={{
                      height: "70px",
                      backgroundColor: key === "back" ? "#E0E0E0" : "#FDEAEA",
                      borderRadius: "15px",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontSize: key === "back" ? "28px" : "36px",
                      fontWeight: "500",
                      color: key === "back" ? "#666666" : "#C32911"
                    }}
                  >
                    {key === "back" ? "←" : key}
                  </button>
                ) : <div key={index} />
              ))}
            </div>

            {/* 확인 버튼 */}
            <button
              onClick={handleVerify}
              disabled={phoneNumber.length !== 11}
              style={{
                width: "100%",
                height: "80px",
                backgroundColor: phoneNumber.length === 11 ? "#C32911" : "#CCCCCC",
                color: "#FFFFFF",
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "32px",
                fontWeight: "600",
                borderRadius: "40px",
                border: "none",
                cursor: phoneNumber.length === 11 ? "pointer" : "default"
              }}
            >
              확인
            </button>
          </div>
        ) : (
          /* 포인트 사용 화면 */
          <div style={{ padding: "50px 80px" }}>
            {/* 포인트 정보 */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "30px",
              paddingBottom: "30px",
              borderBottom: "1px solid #E0E0E0"
            }}>
              <span style={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "32px",
                fontWeight: "500",
                color: "#4A3728"
              }}>보유 포인트</span>
              <span style={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "40px",
                fontWeight: "700",
                color: "#C32911"
              }}>{availablePoints.toLocaleString()}P</span>
            </div>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "30px"
            }}>
              <span style={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "32px",
                fontWeight: "500",
                color: "#4A3728"
              }}>결제 금액</span>
              <span style={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "36px",
                fontWeight: "600",
                color: "#4A3728"
              }}>{totalAmount.toLocaleString()}원</span>
            </div>

            {/* 전액 사용 체크박스 */}
            <button
              onClick={() => setUseAllPoints(!useAllPoints)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "10px 0",
                marginBottom: "40px"
              }}
            >
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                border: useAllPoints ? "none" : "2px solid #C32911",
                backgroundColor: useAllPoints ? "#C32911" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: "24px",
                fontWeight: "bold"
              }}>
                {useAllPoints && "✓"}
              </div>
              <span style={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "28px",
                fontWeight: "500",
                color: "#4A3728"
              }}>포인트 전액 사용 ({Math.min(availablePoints, totalAmount).toLocaleString()}P)</span>
            </button>

            {/* 사용하기 버튼 */}
            <button
              onClick={handleUsePoints}
              style={{
                width: "100%",
                height: "80px",
                backgroundColor: "#C32911",
                color: "#FFFFFF",
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "32px",
                fontWeight: "600",
                borderRadius: "40px",
                border: "none",
                cursor: "pointer"
              }}
            >
              {useAllPoints ? `${Math.min(availablePoints, totalAmount).toLocaleString()}P 사용하기` : "포인트 사용 안함"}
            </button>
          </div>
        )}
      </BottomPanel>

      {/* 직원 호출 모달 */}
      <StaffCallModal
        isOpen={showStaffCallModal}
        onClose={() => setShowStaffCallModal(false)}
      />
    </div>
  );
}
