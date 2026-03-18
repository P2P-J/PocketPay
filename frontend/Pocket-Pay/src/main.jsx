import { createRoot } from "react-dom/client";
import { setTokenProvider } from "@shared/api/client";
import { useAuthStore } from "@features/auth/model/authStore";
import App from "./App.jsx";
import "@app/styles/index.css";

// shared/api/client에 토큰 프로바이더 주입 (FSD 규칙 준수)
setTokenProvider({
  getToken: () => useAuthStore.getState().accessToken,
  onUnauthorized: () => useAuthStore.getState().logout(),
});

createRoot(document.getElementById("root")).render(<App />);
