import { Navigate } from "react-router-dom";
import { useAuthStore } from "@features/auth/model/authStore";

export function ProtectedRoute({ children }) {
  const { accessToken } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
