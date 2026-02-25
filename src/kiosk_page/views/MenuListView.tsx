import { MenuItem } from "../../types/kiosk";
import { categoryLabels } from "../../data/menuData";
import recommendedBurger from "../../assets/recommended_burger.png";

interface MenuListViewProps {
  currentCategory: string;
  menuItems: MenuItem[];
  currentIndex: number;
  itemsPerPage: number;
  onPrev: () => void;
  onNext: () => void;
  onSelectMenu: (item: MenuItem) => void;
}

export default function MenuListView({
  currentCategory,
  menuItems,
  currentIndex,
  itemsPerPage,
  onPrev,
  onNext,
  onSelectMenu,
}: MenuListViewProps) {
  const visibleItems = menuItems.slice(currentIndex, currentIndex + itemsPerPage);

  return (
    <>
      {/* 카테고리 라벨 */}
      <p
        className="absolute left-1/2"
        style={{
          top: "50px",
          transform: "translateX(-50%)",
          width: "850px",
          fontFamily: "'Noto Sans KR', sans-serif",
          fontSize: "34px",
          fontWeight: "500",
          color: "#4A3728",
        }}
      >
        {categoryLabels[currentCategory]}
      </p>

      {/* 왼쪽 화살표 */}
      <button
        onClick={onPrev}
        disabled={currentIndex === 0}
        style={{
          position: "absolute",
          left: "20px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "100px",
          color: currentIndex === 0 ? "#ccc" : "#4A3728",
          background: "none",
          border: "none",
          cursor: currentIndex === 0 ? "default" : "pointer",
          zIndex: 5,
        }}
      >
        ‹
      </button>

      {/* 메뉴 아이템들 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex"
        style={{ top: "120px", gap: "25px" }}
      >
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectMenu(item)}
            className="flex flex-col items-center"
            style={{
              width: "260px",
              backgroundColor: "#FAFAFA",
              borderRadius: "24px",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {/* 이미지 */}
            <div
              className="flex items-center justify-center overflow-hidden"
              style={{
                width: "195px",
                height: "178px",
                backgroundColor: "#FDEAEA",
                borderRadius: "24px",
                marginBottom: "16px"
              }}
            >
              <img
                src={item.image || recommendedBurger}
                alt={item.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = recommendedBurger;
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
            {/* 메뉴 이름 */}
            <span
              style={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "32px",
                fontWeight: "500",
                color: "#4A3728",
                marginBottom: "8px",
              }}
            >
              {item.name}
            </span>
            {/* 가격 */}
            <span
              style={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: "32px",
                fontWeight: "700",
                color: "#C32911",
              }}
            >
              {item.price.toLocaleString()}원
            </span>
          </button>
        ))}
      </div>

      {/* 오른쪽 화살표 */}
      <button
        onClick={onNext}
        disabled={currentIndex >= menuItems.length - itemsPerPage}
        style={{
          position: "absolute",
          right: "20px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "100px",
          color:
            currentIndex >= menuItems.length - itemsPerPage ? "#ccc" : "#4A3728",
          background: "none",
          border: "none",
          cursor:
            currentIndex >= menuItems.length - itemsPerPage
              ? "default"
              : "pointer",
          zIndex: 5,
        }}
      >
        ›
      </button>
    </>
  );
}
