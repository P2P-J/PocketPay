import { useEffect } from "react";
import { useAuthStore } from "@features/auth/model/authStore";

export function useOAuthCallback() {
  const { loginWithOAuth } = useAuthStore();

  useEffect(() => {
    // OAuth 콜백 페이지인지 확인
    if (!window.location.pathname.includes("/oauth/callback")) return;

    (async () => {
      try {
        // 서버의 HTTP-only 쿠키에서 토큰을 가져옴
        const tokenRes = await fetch("/auth/oauth-tokens", {
          credentials: "include",
        });
        if (!tokenRes.ok) return; // 쿠키 없으면 무시

        const { accessToken, refreshToken } = await tokenRes.json();
        if (!accessToken) return;

        // 토큰으로 유저 정보 조회
        const userRes = await fetch("/account/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userRes.ok) throw new Error("유저 정보 조회 실패");

        const user = await userRes.json();
        loginWithOAuth(user, accessToken, refreshToken);
      } catch {
        // OAuth 로그인 실패
      } finally {
        window.location.replace("/home");
      }
    })();
  }, [loginWithOAuth]);
}
