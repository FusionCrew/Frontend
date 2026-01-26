import { MenuItem } from "../../types/kiosk";
import backArrowCircle from "../../assets/back_arrow_circle.png";
import recommendedBurger from "../../assets/recommended_burger.png";

interface MenuDetailViewProps {
  menu: MenuItem;
  nutritionOpen: boolean;
  allergyOpen: boolean;
  onBack: () => void;
  onOrder: () => void;
  onToggleNutrition: () => void;
  onToggleAllergy: () => void;
}

export default function MenuDetailView({
  menu,
  nutritionOpen,
  allergyOpen,
  onBack,
  onOrder,
  onToggleNutrition,
  onToggleAllergy,
}: MenuDetailViewProps) {
  return (
    <>
      {/* 뒤로가기 버튼 (원형 이미지) */}
      <button
        onClick={onBack}
        style={{
          position: "absolute",
          top: "50px",
          left: "80px",
          width: "70px",
          height: "70px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0",
          zIndex: 5,
        }}
      >
        <img
          src={backArrowCircle}
          alt="뒤로가기"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </button>

      {/* 메뉴 이름 + 주문하기 버튼 */}
      <div
        style={{
          position: "absolute",
          top: "103px",
          left: "280px",
          right: "80px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "40px",
              fontWeight: "600",
              color: "#4A3728",
              marginBottom: "12px",
            }}
          >
            {menu.name}
          </p>
          <p
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "32px",
              fontWeight: "500",
              color: "#C32911",
            }}
          >
            {menu.price.toLocaleString()}원 ~
          </p>
        </div>
        <button
          onClick={onOrder}
          style={{
            backgroundColor: "#C32911",
            color: "#FFFFFF",
            fontFamily: "'Noto Sans KR', sans-serif",
            fontSize: "28px",
            fontWeight: "600",
            padding: "18px 35px",
            borderRadius: "16px",
            border: "none",
            cursor: "pointer",
          }}
        >
          주문하기
        </button>
      </div>

      {/* 메뉴 이미지 - 상하 중앙정렬 */}
      <img
        src={recommendedBurger}
        alt={menu.name}
        style={{
          position: "absolute",
          top: "55%",
          left: "80px",
          transform: "translateY(-50%)",
          width: "160px",
          height: "auto",
          objectFit: "contain",
        }}
      />

      {/* 영양정보 아코디언 */}
      <div
        style={{
          position: "absolute",
          top: "225px",
          left: "280px",
          right: "80px",
        }}
      >
        {/* 영양정보 헤더 */}
        <div
          onClick={onToggleNutrition}
          style={{
            borderBottom: "1px solid #444444",
            paddingBottom: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "30px",
              fontWeight: "500",
              color: "#4A3728",
            }}
          >
            영양정보
          </span>
          <span
            style={{
              fontSize: "36px",
              color: "#444444",
              fontWeight: "300",
            }}
          >
            {nutritionOpen ? "−" : "+"}
          </span>
        </div>

        {/* 영양정보 내용 */}
        {nutritionOpen && (
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "20px",
              paddingBottom: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#FDEAEA",
                borderRadius: "12px",
                padding: "20px 30px",
                textAlign: "center",
                minWidth: "120px",
              }}
            >
              <p
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#4A3728",
                  marginBottom: "8px",
                }}
              >
                550Cal.
              </p>
              <p
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "24px",
                  color: "#666",
                }}
              >
                칼로리
              </p>
            </div>
            <div
              style={{
                backgroundColor: "#FDEAEA",
                borderRadius: "12px",
                padding: "20px 30px",
                textAlign: "center",
                minWidth: "100px",
              }}
            >
              <p
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#4A3728",
                  marginBottom: "8px",
                }}
              >
                25g
              </p>
              <p
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "24px",
                  color: "#666",
                }}
              >
                단백질
              </p>
            </div>
            <div
              style={{
                backgroundColor: "#FDEAEA",
                borderRadius: "12px",
                padding: "20px 30px",
                textAlign: "center",
                minWidth: "100px",
              }}
            >
              <p
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#4A3728",
                  marginBottom: "8px",
                }}
              >
                30g
              </p>
              <p
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "24px",
                  color: "#666",
                }}
              >
                지방
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 알레르기 정보 - 영양정보가 닫혀있을 때만 표시 */}
      {!nutritionOpen && (
        <div
          style={{
            position: "absolute",
            top: "302px",
            left: "280px",
            right: "80px",
          }}
        >
          {/* 알레르기 정보 헤더 */}
          <div
            onClick={onToggleAllergy}
            style={{
              borderBottom: "1px solid #444444",
              paddingBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "30px",
                fontWeight: "500",
                color: "#4A3728",
              }}
            >
              알레르기 정보
            </span>
            <span
              style={{
                fontSize: "36px",
                color: "#444444",
                fontWeight: "300",
              }}
            >
              {allergyOpen ? "−" : "+"}
            </span>
          </div>

          {/* 알레르기 정보 내용 */}
          {allergyOpen && (
            <div
              style={{
                marginTop: "20px",
                paddingBottom: "20px",
              }}
            >
              <p
                style={{
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontSize: "26px",
                  color: "#4A3728",
                  lineHeight: "1.6",
                }}
              >
                밀, 대두, 우유, 토마토, 쇠고기, 돼지고기, 계란
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
