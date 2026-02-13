import { StaffCallButton, BackButton } from "../components/KioskComponents";
import takeoutIcon from "../assets/takeout_icon.png";
import dineinIcon from "../assets/dinein_icon.png";

interface KioskOrderProps {
  onBack: () => void;
  onSelectType: (type: "DINE_IN" | "TAKE_OUT") => void;
  speaking?: boolean;
}

export default function KioskOrder({ onBack, onSelectType }: KioskOrderProps) {
  return (
    <div className="w-full h-full relative">
      <BackButton onClick={onBack} />
      <StaffCallButton />

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
          식사 방법을 선택해 주세요
        </p>
        <p style={{ fontSize: "40px", fontWeight: "bold" }}>
          또는 음성으로 "매장" / "포장"이라고 말씀해 주세요
        </p>
      </div>

      <div className="absolute left-0 right-0 flex justify-center items-end" style={{ bottom: "100px", gap: "60px" }}>
        <button
          onClick={() => onSelectType("TAKE_OUT")}
          className="flex flex-col items-center justify-end shadow-lg"
          style={{
            width: "429px",
            height: "366px",
            borderRadius: "32px",
            backgroundColor: "#C32911",
            color: "#FFFFFF",
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "72px",
            fontWeight: "500",
            paddingBottom: "40px",
          }}
        >
          <img src={takeoutIcon} alt="포장" style={{ width: "160px", height: "140px", objectFit: "contain", marginBottom: "24px" }} />
          <span>포장 주문</span>
        </button>

        <button
          onClick={() => onSelectType("DINE_IN")}
          className="flex flex-col items-center justify-end shadow-lg"
          style={{
            width: "429px",
            height: "366px",
            borderRadius: "32px",
            backgroundColor: "#F3D4CF",
            color: "#C32911",
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "72px",
            fontWeight: "500",
            paddingBottom: "40px",
          }}
        >
          <img src={dineinIcon} alt="매장" style={{ width: "200px", height: "140px", objectFit: "contain", marginBottom: "24px" }} />
          <span>매장 식사</span>
        </button>
      </div>
    </div>
  );
}
