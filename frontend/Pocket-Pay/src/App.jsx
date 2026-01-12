import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useTeamStore } from "./store/teamStore";
import { LandingPage } from "./pages/HomePage";
import TeamMain from "./pages/teamMain";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const { accessToken, loading, checkAuth } = useAuthStore();
  const { fetchTeams } = useTeamStore();

  useEffect(() => {
    checkAuth();
  }, []);

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
