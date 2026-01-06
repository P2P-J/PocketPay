import { apiClient } from "./client";

export const dealApi = {
  create: (data) => apiClient.post("/deal/register", data),
  getMonthly: (teamId, year, month) =>
    apiClient.get(`/deal/monthly?teamId=${teamId}&year=${year}&month=${month}`),
  getDetail: (dealId) => apiClient.get(`/deal/${dealId}`),
  update: (dealId, data) => apiClient.put(`/deal/${dealId}`, data),
  delete: (dealId) => apiClient.delete(`/deal/${dealId}`),
};
