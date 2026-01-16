import { apiClient } from "./client";

export const teamApi = {
  create: (data) => apiClient.post("/teams", data),
  getMyTeams: () => apiClient.get("/teams"),
  getTeam: (id) => apiClient.get(`/teams/${id}`),
  update: (id, data) => apiClient.put(`/teams/${id}`, data),
  delete: (id) => apiClient.delete(`/teams/${id}`),
  inviteMember: (id, email) =>
    apiClient.post(`/teams/${id}/members`, { email }),
  removeMember: (teamId, userId) =>
    apiClient.delete(`/teams/${teamId}/members/${userId}`),
};
