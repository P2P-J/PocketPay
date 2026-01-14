import { apiClient } from "./client";

export const dealApi = {
  create: (data) => apiClient.post("/deals", data),
  getMonthly: (teamId, year, month) =>
    apiClient.get(`/deals?teamId=${teamId}&year=${year}&month=${month}`),
  getDetail: (dealId) => apiClient.get(`/deals/${dealId}`),
  update: (dealId, data) => apiClient.put(`/deals/${dealId}`, data),
  delete: (dealId) => apiClient.delete(`/deals/${dealId}`),
};
