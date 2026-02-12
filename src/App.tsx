import { Routes, Route } from "react-router-dom";
import GatePage from "./kiosk_page/GatePage";
import KioskApp from "./kiosk_page/KioskApp";
import AdminLoginPage from "./kiosk_page/AdminLoginPage";
import "./App.css";

function App() {
  return (
    <Routes>
      {/* Starting point: Gate selection page */}
      <Route path="/" element={<GatePage />} />

      {/* Kiosk flow - supporting all nested routes under /kiosk */}
      <Route path="/kiosk/*" element={<KioskApp />} />

      {/* Admin flow */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
    </Routes>
  );
}

export default App;
