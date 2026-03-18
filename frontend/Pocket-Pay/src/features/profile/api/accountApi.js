import { apiClient } from "@shared/api/client";

export const accountApi = {
  me: () => apiClient.get("/account/me"),
  deleteAccount: () => apiClient.delete("/account/me"),
  changePassword: (data) => apiClient.put("/account/me/changePassword", data),
};
