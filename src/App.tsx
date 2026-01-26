import { useState } from "react";
import KioskMain from "./kiosk_page/KioskMain";
import KioskOrder from "./kiosk_page/KioskOrder";
import KioskMenu from "./kiosk_page/KioskMenu";
import KioskRecommended from "./kiosk_page/KioskRecommended";
import KioskCategoryPage from "./kiosk_page/KioskCategoryPage";

type PageType = "main" | "order" | "menu" | "recommended" | "burgerSingle" | "burgerSet" | "side" | "drink";

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("main");

  const goToMain = () => setCurrentPage("main");
  const goToOrder = () => setCurrentPage("order");
  const goToMenu = () => setCurrentPage("menu");
  const goToRecommended = () => setCurrentPage("recommended");

  const handleCategory = (category: string) => {
    if (category === "burgerSingle" || category === "burgerSet" || category === "side" || category === "drink") {
      setCurrentPage(category as PageType);
    }
  };

  // 카테고리 페이지들
  if (currentPage === "burgerSingle" || currentPage === "burgerSet" || currentPage === "side" || currentPage === "drink") {
    return (
      <KioskCategoryPage 
        onBack={goToMenu} 
        onCategory={handleCategory} 
        currentCategory={currentPage}
        onGoToMain={goToMain}
      />
    );
  }

  if (currentPage === "recommended") {
    return <KioskRecommended onBack={goToMenu} onGoToMain={goToMain} />;
  }

  if (currentPage === "menu") {
    return <KioskMenu onBack={goToOrder} onRecommended={goToRecommended} onCategory={handleCategory} />;
  }

  if (currentPage === "order") {
    return <KioskOrder onBack={goToMain} onSelectType={goToMenu} />;
  }

  return <KioskMain onOrder={goToOrder} onAccessibility={goToOrder} />;
}

export default App;
