import { apiClient } from "./client";

export const authApi = {
  signup: (data) => apiClient.post("/auth/signup/local", data),
  login: (data) => apiClient.post("/auth/login/local", data),

  // Account API
  me: () => apiClient.get("/account/me"),
  deleteAccount: () => apiClient.delete("/account/me"),
  changePassword: (data) => apiClient.put("/account/me/changePassword", data),
};
