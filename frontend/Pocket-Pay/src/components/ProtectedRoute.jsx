import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function ProtectedRoute({ children }) {
  const { accessToken } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
