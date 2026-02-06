import { StaffCallButton, BackButton, KioskCharacter } from "../components/KioskComponents";
import takeoutIcon from "../assets/takeout_icon.png";
import dineinIcon from "../assets/dinein_icon.png";

interface KioskOrderProps {
  onBack: () => void;
  onSelectType: () => void;
  speaking?: boolean;
}

export default function KioskOrder({ onBack, onSelectType }: KioskOrderProps) {
  return (
    <div className="w-full h-full relative">
      {/* 뒤로가기 버튼 */}
      <BackButton onClick={onBack} />

      {/* 직원 호출 버튼 */}
      <StaffCallButton />

      {/* 메인 안내 텍스트 */}
      <div
        className="absolute left-0 right-0 text-center"
        style={{
          top: "178px",
          color: "#4A3728",
          fontFamily: "'Noto Sans KR', sans-serif",
          zIndex: 100
        }}
      >
        <p style={{ fontSize: "56px", fontWeight: "bold", lineHeight: "1.5" }}>
          어떻게 이용하실 건가요?
        </p>
        <p style={{ fontSize: "56px", fontWeight: "bold" }}>
          포장과 매장 식사가 있어요
        </p>
      </div>

      {/* 하단 선택 버튼들 */}
      <div
        className="absolute left-0 right-0 flex justify-center items-end"
        style={{ bottom: "100px", gap: "60px" }}
      >
        {/* 포장주문 버튼 */}
        <button
          onClick={onSelectType}
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
            paddingBottom: "40px"
          }}
        >
          <img src={takeoutIcon} alt="포장" style={{ width: "160px", height: "140px", objectFit: "contain", marginBottom: "24px" }} />
          <span>포장주문</span>
        </button>

        {/* 매장 식사 버튼 */}
        <button
          onClick={onSelectType}
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
            paddingBottom: "40px"
          }}
        >
          <img src={dineinIcon} alt="매장" style={{ width: "200px", height: "140px", objectFit: "contain", marginBottom: "24px" }} />
          <span>매장 식사</span>
        </button>
      </div>
    </div>
  );
}
