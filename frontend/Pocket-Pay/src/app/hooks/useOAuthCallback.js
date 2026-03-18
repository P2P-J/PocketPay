import { useEffect } from "react";
import { useAuthStore } from "@features/auth/model/authStore";

export function useOAuthCallback() {
  const { loginWithOAuth } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;

    (async () => {
      try {
        const res = await fetch("/account/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`auth/me failed: ${res.status}`);

        const user = await res.json();
        localStorage.setItem("accessToken", token);
        localStorage.setItem("user", JSON.stringify(user));
        loginWithOAuth(user, token);
      } catch {
        console.error("SNS 로그인 처리 중 오류가 발생했습니다.");
      } finally {
        window.location.replace("/home");
      }
    })();
  }, [loginWithOAuth]);
}
