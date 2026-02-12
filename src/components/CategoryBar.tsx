import menuBurgerSingle from "../assets/menu_burger_single.png";
import menuBurgerSet from "../assets/menu_burger_set.png";
import menuSide from "../assets/menu_side.png";
import menuDrink from "../assets/menu_drink.png";

// 카테고리 데이터
const categories = [
  { id: "burger", name: "버거", image: menuBurgerSingle },
  { id: "side", name: "사이드", image: menuSide },
  { id: "drink", name: "음료", image: menuDrink },
];

interface CategoryBarProps {
  currentCategory: "burger" | "side" | "drink" | "all";
  onCategory: (category: string) => void;
}

export default function CategoryBar({ currentCategory, onCategory }: CategoryBarProps) {
  // 현재 카테고리 인덱스
  const currentCategoryIndex = categories.findIndex(cat => cat.id === currentCategory);

  // 카테고리 이전/다음 이동
  const handlePrevCategory = () => {
    if (currentCategoryIndex > 0) {
      onCategory(categories[currentCategoryIndex - 1].id);
    }
  };

  const handleNextCategory = () => {
    if (currentCategoryIndex < categories.length - 1) {
      onCategory(categories[currentCategoryIndex + 1].id);
    }
  };

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
      style={{
        top: "147px",
        width: "918px",
        height: "215px",
        backgroundColor: "#FFFFFF",
        borderRadius: "40px",
        gap: "25px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        zIndex: 10
      }}
    >
      {/* 왼쪽 화살표 */}
      <button
        onClick={handlePrevCategory}
        disabled={currentCategoryIndex === 0}
        style={{
          fontSize: "120px",
          lineHeight: "1",
          color: currentCategoryIndex === 0 ? "#ccc" : "#4A3728",
          background: "none",
          border: "none",
          cursor: currentCategoryIndex === 0 ? "default" : "pointer",
          padding: "0",
          display: "flex",
          alignItems: "center",
          height: "100%",
          marginBottom: "30px"
        }}
      >
        ‹
      </button>

      {/* 카테고리 아이템들 */}
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategory(cat.id)}
          className="flex flex-col items-center"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0"
          }}
        >
          <div
            style={{
              width: "140px",
              height: "125px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "20px",
              backgroundColor: "#FDEAEA",
              border: cat.id === currentCategory ? "3px solid #C32911" : "3px solid transparent",
              marginBottom: "8px"
            }}
          >
            <img
              src={cat.image}
              alt={cat.name}
              style={{ width: "90px", height: "90px", objectFit: "contain" }}
            />
          </div>
          <span
            style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: "28px",
              fontWeight: "500",
              color: "#4A3728"
            }}
          >
            {cat.name}
          </span>
        </button>
      ))}

      {/* 오른쪽 화살표 */}
      <button
        onClick={handleNextCategory}
        disabled={currentCategoryIndex >= categories.length - 1}
        style={{
          fontSize: "120px",
          lineHeight: "1",
          color: currentCategoryIndex >= categories.length - 1 ? "#ccc" : "#4A3728",
          background: "none",
          border: "none",
          cursor: currentCategoryIndex >= categories.length - 1 ? "default" : "pointer",
          padding: "0",
          display: "flex",
          alignItems: "center",
          height: "100%",
          marginBottom: "30px"
        }}
      >
        ›
      </button>
    </div>
  );
}
