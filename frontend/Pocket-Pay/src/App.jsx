import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useTeamStore } from "./store/teamStore";
import { LandingPage } from "./pages/HomePage";
import TeamMain from "./pages/teamMain";
import { Toaster } from "./components/ui/sonner";
import { authApi } from "./api/auth";

export default function App() {
  const { user, accessToken, loading, checkAuth, loginWithOAuth } =
    useAuthStore();
  const { fetchTeams } = useTeamStore();

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
        window.history.replaceState(null, "", "/");
      }
    })();
  }, [loginWithOAuth]);

  // ✅ 2. 기존 토큰 유효성 확인
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (accessToken) {
      fetchTeams();
    }
  }, [accessToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/team" element={<TeamMain />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
