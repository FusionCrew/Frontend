interface StaffCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StaffCallModal({ isOpen, onClose }: StaffCallModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
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
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "700px",
          backgroundColor: "#FFFFFF",
          borderRadius: "40px",
          padding: "60px 50px",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        {/* 메시지 */}
        <p
          style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "44px",
            fontWeight: "600",
            color: "#4A3728",
            marginBottom: "20px",
          }}
        >
          직원 호출중입니다
        </p>
        <p
          style={{
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "32px",
            fontWeight: "400",
            color: "#888888",
            marginBottom: "40px",
          }}
        >
          잠시만 기다려주세요
        </p>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          style={{
            width: "300px",
            height: "80px",
            backgroundColor: "#C32911",
            color: "#FFFFFF",
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "32px",
            fontWeight: "600",
            borderRadius: "40px",
            border: "none",
            cursor: "pointer",
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}
