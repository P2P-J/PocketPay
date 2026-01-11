// src/App.jsx
import { useEffect, useState } from "react";
import { useAuthStore } from "./store/authStore";
import { useTeamStore } from "./store/teamStore";
import { LandingPage } from "./pages/HomePage";
import TeamMain from "./pages/teamMain";
import { AuthScreen } from "./components/AuthScreen";
import { CreateTeamModal } from "./components/modals/createTeamModal";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const { accessToken, checkAuth, loginWithOAuth } = useAuthStore();
  const { fetchTeams } = useTeamStore();

  const [currentScreen, setCurrentScreen] = useState("homepage");
  const [showAuth, setShowAuth] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  // ✅ App에서만 쓰는 "초기 인증 확인 중" 상태
  const [authChecking, setAuthChecking] = useState(true);

  // ✅ SNS OAuth 콜백 처리 (구글/네이버에서 token 줬을 때)
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
          throw new Error(`auth/me failed: ${res.status}`);
        }

        const user = await res.json();

        localStorage.setItem("accessToken", token);
        localStorage.setItem("user", JSON.stringify(user));

        loginWithOAuth(user, token);
      } catch (err) {
        alert("SNS 로그인 처리 중 오류가 발생했습니다.");
      } finally {
        // URL에서 ?token=... 제거
        window.history.replaceState(null, "", "/");
      }
    })();
  }, [loginWithOAuth]);

  // ✅ 앱 시작 시 한 번만 토큰 유효성 확인
  useEffect(() => {
    (async () => {
      try {
        await checkAuth();
      } finally {
        setAuthChecking(false);
      }
    })();
  }, [checkAuth]);

  // ✅ 로그인 된 상태면 팀 목록 가져오기
  useEffect(() => {
    if (accessToken) {
      fetchTeams();
    }
  }, [accessToken, fetchTeams]);

  // 🔵 이 로딩은 "앱 처음 켰을 때 인증 확인" 에만 사용
  if (authChecking) {
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
    <>
      {/* 홈 화면 */}
      {currentScreen === "homepage" && (
        <LandingPage
          onEnterApp={() => setCurrentScreen("team-main")}
          // 필요하면 상단 네비에서 이걸 써서 App 레벨 모달 띄우게 할 수도 있음
          onAuthClick={() => setShowAuth(true)}
        />
      )}

      {/* 팀 메인 화면 */}
      {currentScreen === "team-main" && (
        <TeamMain
          onBack={() => setCurrentScreen("homepage")}
          onAuthClick={() => setShowAuth(true)}
        />
      )}

      {/* 팀 생성 모달 (트리거는 나중에 연결) */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <CreateTeamModal onClose={() => setShowCreateTeam(false)} />
        </div>
      )}

      {/* 🔐 로그인/회원가입 모달 (App 레벨) */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <AuthScreen onClose={() => setShowAuth(false)} />
          </div>
        </div>
      )}

      <Toaster />
    </>
  );
}