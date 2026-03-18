import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import { setTokenProvider } from "@shared/api/client";
import { useAuthStore } from "@features/auth/model/authStore";
import App from "./App";
import "@app/styles/index.css";

// Sentry 초기화 (환경변수가 있을 때만)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  });
}

setTokenProvider({
  getToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokenRefreshed: (newToken) => useAuthStore.getState().setAccessToken(newToken),
  onUnauthorized: () => useAuthStore.getState().logout(),
});

createRoot(document.getElementById("root")).render(<App />);
