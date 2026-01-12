import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useTeamStore } from "./store/teamStore";
import { LandingPage } from "./pages/HomePage";
import TeamMain from "./pages/teamMain";
import { ProfilePage } from "./pages/ProfilePage";
import { LoadingScreen } from "./components/AuthScreen";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const { accessToken, checkAuth, loginWithOAuth } = useAuthStore();
  const { fetchTeams } = useTeamStore();

  // App에서만 쓰는 "초기 인증 확인 중" 상태
  const [authChecking, setAuthChecking] = useState(true);

  // ✅ 1. SNS OAuth 콜백 처리 (구글/네이버에서 token 줬을 때)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) return;

    (async () => {
      try {
        const res = await fetch("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`auth/me failed: ${res.status}`);
        }

        const user = await res.json();

        localStorage.setItem("accessToken", token);
        localStorage.setItem("user", JSON.stringify(user));

        loginWithOAuth(user, token);
      } catch (err) {
        alert("SNS 로그인 처리 중 오류가 발생했습니다.");
      } finally {
        window.location.replace("/home");
      }
    })();
  }, [loginWithOAuth]);

  // ✅ 2. 앱 처음 켰을 때 기존 토큰 유효성 확인
  useEffect(() => {
    (async () => {
      try {
        await checkAuth();
      } finally {
        setAuthChecking(false);
      }
    })();
  }, [checkAuth]);

  // ✅ 3. 로그인 된 상태면 팀 목록 가져오기
  useEffect(() => {
    if (accessToken) {
      fetchTeams();
    }
  }, [accessToken, fetchTeams]);

  if (authChecking) {
    return <LoadingScreen />;
  }

  // 나머지는 기존 그대로
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/team" element={<TeamMain />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
