import { useEffect, useState } from "react";
import { useAuthStore } from "./store/authStore";
import { useTeamStore } from "./store/teamStore";
import { LandingPage } from "./pages/HomePage";
import TeamMain from "./pages/teamMain";
import { AuthScreen } from "./components/AuthScreen";
import { CreateTeamModal } from "./components/modals/createTeamModal";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const { user, accessToken, loading, checkAuth, loginWithOAuth } = useAuthStore();
  const { currentTeam, fetchTeams, fetchCategories } = useTeamStore();
  const [currentScreen, setCurrentScreen] = useState("homepage");
  const [showAuth, setShowAuth] = useState(false);
   const [showCreateTeam, setShowCreateTeam] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const token = params.get("token");
    const email = params.get("email");
    const name = params.get("name");
    const provider = params.get("provider");

    if (token && email && loginWithOAuth) {
      loginWithOAuth(
        {
          email,
          name: name ?? "",
          provider: provider ?? "oauth",
        },
        token
      );

      window.history.replaceState(null, "", window.location.pathname);
    }
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

  // Categories are not fetched from backend - removed unnecessary effect
  // useEffect(() => {
  //   if (accessToken && currentTeam) {
  //     fetchCategories(accessToken, currentTeam.id);
  //   }
  // }, [accessToken, currentTeam]);

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

  // HomePage 화면
  if (currentScreen === "homepage") {
    return (
      <>
        <LandingPage onEnterApp={() => setCurrentScreen("team-main")} />
        <Toaster />
      </>
    );
  }

  // TeamMain 화면 (거래 관리)
  if (currentScreen === "team-main") {
    return (
      <>
        <TeamMain onBack={() => setCurrentScreen("homepage")} />
        <Toaster />
      </>
    );
  }

  // 기본 화면 (필요시 추가)
  return (
    <>
      {/* 팀 생성 모달 */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <CreateTeamModal onClose={() => setShowCreateTeam(false)} />
        </div>
      )}

      {/* 로그인 모달 */}
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
