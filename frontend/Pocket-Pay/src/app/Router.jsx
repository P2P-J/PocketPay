import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoadingScreen } from "@features/auth/ui/AuthScreen";
import { ProtectedRoute } from "@features/auth/ui/ProtectedRoute";

const LandingPage = lazy(() =>
  import("@pages/home/HomePage").then((m) => ({ default: m.LandingPage }))
);
const TeamPage = lazy(() => import("@pages/team/TeamPage"));
const ProfilePage = lazy(() =>
  import("@pages/profile/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const NotFoundPage = lazy(() =>
  import("@pages/not-found/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
);

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<LandingPage />} />
        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <TeamPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/oauth/callback" element={<LoadingScreen />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
