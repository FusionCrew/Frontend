import arrowIcon from "../assets/arrow_icon.png";
import { StaffCallButton, KioskCharacter } from "../components/KioskComponents";

interface KioskMainProps {
  onOrder: () => void;
  onAccessibility: () => void;
}

export default function KioskMain({ onOrder, onAccessibility }: KioskMainProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-200">
      {/* 키오스크 프레임 - 1080x1920 */}
      <div
        className="relative overflow-hidden"
        style={{
          width: "1080px",
          height: "1920px",
          backgroundColor: "#F5EDE4",
        }}
      >
        {/* 직원 호출 버튼 */}
        <StaffCallButton />

        {/* 메인 안내 텍스트 */}
        <div
          className="absolute left-0 right-0 text-center"
          style={{ 
            top: "178px",
            color: "#4A3728",
            fontFamily: "'Noto Sans KR', sans-serif"
          }}
        >
          <p style={{ fontSize: "56px", fontWeight: "bold", lineHeight: "1.5" }}>
            주문을 원하시면 화면을 터치하거나,
          </p>
          <p style={{ fontSize: "56px", fontWeight: "bold" }}>
            저에게 말씀해 주세요
          </p>
        </div>

        {/* 캐릭터 이미지 */}
        <KioskCharacter />

        {/* 주문하기 버튼 */}
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
            fontFamily: "'Noto Sans KR', sans-serif"
          }}
        >
          <span>주문하기</span>
          <img src={arrowIcon} alt="화살표" style={{ height: "80px", width: "auto" }} />
        </button>

        {/* 시각장애인 음성 안내 - 버튼으로부터 33px 아래 */}
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
            cursor: "pointer"
          }}
        >
          시각장애인 음성 안내
        </button>
      </div>
    </div>
  );
}
