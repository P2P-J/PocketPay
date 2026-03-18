import { Navigate } from "react-router-dom";
import { useAuthStore } from "@features/auth/model/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { accessToken } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
