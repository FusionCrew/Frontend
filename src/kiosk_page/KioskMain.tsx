import arrowIcon from "../assets/arrow_icon.png";
import { StaffCallButton } from "../components/KioskComponents";

interface KioskMainProps {
  onOrder: () => void;
  onAccessibility: () => void;
  onStaffCall?: () => void;
  speaking?: boolean;
}

export default function KioskMain({ onOrder, onAccessibility, onStaffCall }: KioskMainProps) {
  return (
    <div className="w-full h-full relative">
      <StaffCallButton onClick={onStaffCall} />

      <div
        className="absolute left-0 right-0 text-center"
        style={{
          top: "178px",
          color: "#4A3728",
          fontFamily: "'Noto Sans KR', sans-serif",
          zIndex: 100,
        }}
      >
        <p style={{ fontSize: "56px", fontWeight: "bold", lineHeight: "1.5" }}>
          음성 주문을 시작하려면
        </p>
        <p style={{ fontSize: "48px", fontWeight: "bold" }}>
          오른쪽 DEV에서 VOICE START를 눌러주세요
        </p>
      </div>

      <button
        onClick={onOrder}
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 text-white shadow-lg"
        style={{
          bottom: "204px",
          width: "919px",
          height: "197px",
          borderRadius: "99px",
          backgroundColor: "#C32911",
          fontSize: "72px",
          fontWeight: "500",
          fontFamily: "'Noto Sans KR', sans-serif",
        }}
      >
        <span>주문하기</span>
        <img src={arrowIcon} alt="안내" style={{ height: "80px", width: "auto" }} />
      </button>

      <button
        onClick={onAccessibility}
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: "120px",
          color: "#FFFFFF",
          fontSize: "40px",
          fontFamily: "'Noto Sans KR', sans-serif",
          borderBottom: "1px solid #FFFFFF",
          paddingBottom: "4px",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        시각장애인 음성 안내
      </button>
    </div>
  );
}
