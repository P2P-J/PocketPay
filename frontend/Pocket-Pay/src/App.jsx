import { useEffect, useState } from "react";
import { useAuthStore } from "./store/authStore";
import { useTeamStore } from "./store/teamStore";
import { AuthScreen } from "./components/AuthScreen";
import { CreateTeamModal } from "./components/CreateTeamModal";
import { MainLayout } from "./components/MainLayout";
import { DashboardContent } from "./components/DashboardContent";
import { MonthlyContent } from "./components/MonthlyContent";
import { ReportContent } from "./components/ReportContent";
import { SettingsContent } from "./components/SettingsContent";
import { AddTransactionScreen } from "./components/AddTransactionScreen";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const { user, accessToken, loading, checkAuth } = useAuthStore();
  const { currentTeam, loadLocalTeams, fetchTeams, fetchCategories } =
    useTeamStore();
  const [currentScreen, setCurrentScreen] = useState("main");
  const [currentTab, setCurrentTab] = useState("home");
  const [showAuth, setShowAuth] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  useEffect(() => {
    checkAuth();

    // 로컬 팀 로드
    loadLocalTeams();
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchTeams(accessToken);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && currentTeam) {
      fetchCategories(accessToken, currentTeam.id);
    }
  }, [accessToken, currentTeam]);

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

  // 거래 추가 화면일 때는 레이아웃 없이 전체 화면
  if (currentScreen === "add-transaction") {
    return (
      <>
        <AddTransactionScreen onBack={() => setCurrentScreen("main")} />
        <Toaster />
      </>
    );
  }

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

      {/* 메인 레이아웃 */}
      <MainLayout
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onCreateTeam={() => setShowCreateTeam(true)}
        onShowAuth={() => setShowAuth(true)}
      >
        {currentTab === "home" && (
          <DashboardContent
            onAddTransaction={() => setCurrentScreen("add-transaction")}
          />
        )}

        {currentTab === "monthly" && <MonthlyContent />}

        {currentTab === "report" && <ReportContent />}

        {currentTab === "settings" && <SettingsContent />}
      </MainLayout>

      <Toaster />
    </>
  );
}
