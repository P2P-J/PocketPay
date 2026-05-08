import { apiClient } from "./client";

type MeResponse = {
  id?: string;
  _id?: string;
  email: string;
  name: string;
  nickname: string;
  handle?: string;
  handleChangedAt?: string;
  provider: string;
};

export const authApi = {
  signup: (data: {
    name: string;
    nickname: string;
    handle: string;
    email: string;
    password: string;
  }) => apiClient.post("/auth/signup/local", data),

  login: (data: { email: string; password: string }) =>
    apiClient.post("/auth/login/local", data) as Promise<{
      accessToken: string;
      refreshToken: string;
    }>,

  refresh: (refreshToken: string) =>
    apiClient.post("/auth/refresh", { refreshToken }) as Promise<{
      accessToken: string;
    }>,

  me: () => apiClient.get("/account/me") as Promise<MeResponse>,

  completeOAuthProfile: (data: {
    name?: string;
    nickname: string;
    handle: string;
  }) =>
    apiClient.post("/auth/oauth/complete-profile", data) as Promise<{
      data: MeResponse;
    }>,

  deleteAccount: () => apiClient.delete("/account/me"),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put("/account/me/changePassword", data),

  sendCode: (data: { email: string; purpose: string }) =>
    apiClient.post("/auth/send-code", data),

  verifyCode: (data: { email: string; code: string; purpose: string }) =>
    apiClient.post("/auth/verify-code", data) as Promise<{ verified: boolean }>,

  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    apiClient.post("/auth/reset-password", data),
};
