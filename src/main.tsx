import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BRAND_NAME } from "./lib/brand";

document.title = `${BRAND_NAME} — Tạo thiệp cưới của riêng bạn`;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
