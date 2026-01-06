import { apiClient } from "./client";

export const teamApi = {
  create: (data) => apiClient.post("/team", data),
  getMyTeams: () => apiClient.get("/team"),
  getTeam: (id) => apiClient.get(`/team/${id}`),
  update: (id, data) => apiClient.put(`/team/${id}`, data),
  delete: (id) => apiClient.delete(`/team/${id}`),
  inviteMember: (id, email) => apiClient.post(`/team/${id}/invite`, { email }),
};
