import bellIcon from "../assets/bell_icon.png";
import backIcon from "../assets/back_icon.png";
import kioskCharacter from "../assets/kiosk_character.png";
import { Live2DStage } from "./Live2DStage";

// 직원 호출 버튼
interface StaffCallButtonProps {
  onClick?: () => void;
}

export function StaffCallButton({ onClick }: StaffCallButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute flex items-center gap-1 active:scale-95 transition-transform"
      style={{
        top: "45px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "#4A3728",
        fontSize: "40px",
        fontWeight: "400",
        fontFamily: "'Noto Sans KR', sans-serif",
        background: "none",
        border: "none",
        cursor: "pointer",
        zIndex: 1000
      }}
    >
      <span>직원 호출</span>
      <img src={bellIcon} alt="벨" style={{ width: "40px", height: "40px" }} />
    </button>
  );
}

// 뒤로가기 버튼
interface BackButtonProps {
  onClick: () => void;
}

export function BackButton({ onClick }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute flex items-center justify-center"
      style={{
        top: "45px",
        left: "44px",
        width: "80px",
        height: "80px"
      }}
    >
      <img src={backIcon} alt="뒤로가기" style={{ width: "60px", height: "auto" }} />
    </button>
  );
}

// 키오스크 캐릭터
export function KioskCharacter({ speaking, tracking }: { speaking?: boolean; tracking?: any }) {
  return (
    <div className="absolute inset-0 flex justify-center mb-0 pointer-events-none z-0">
      <Live2DStage speaking={speaking} tracking={tracking} />
    </div>
  );
}

// 하단 패널
interface BottomPanelProps {
  children: React.ReactNode;
  zIndex?: number;
  height?: string;
}

export function BottomPanel({ children, zIndex = 2, height = "469px" }: BottomPanelProps) {
  return (
    <div
      className="absolute left-0 right-0 bottom-0"
      style={{
        height,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: "100px",
        borderTopRightRadius: "100px",
        zIndex,
        overflow: "hidden"
      }}
    >
      {children}
    </div>
  );
}
