import { apiClient } from "./client";

export const changePassword = async (currentPassword, newPassword) => {
  const response = await apiClient.put("/account/me/changePassword", {
    currentPassword,
    newPassword,
  });
  return response;
};

export const deleteAccount = async () => {
  const response = await apiClient.delete("/account/me");
  return response;
};
