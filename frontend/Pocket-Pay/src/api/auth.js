import { apiClient } from "./client";

export const authApi = {
  signup: (data) => apiClient.post("/auth/signup/local", data),
  login: (data) => apiClient.post("/auth/login/local", data),

  me: () => apiClient.get("/auth/me"),
};
