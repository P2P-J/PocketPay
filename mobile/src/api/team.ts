import { apiClient } from "./client";
import type { Team } from "@/types/team";

// 백엔드 응답은 모두 { data: ... } 또는 { message: ..., data: ... } 형태
type DataResponse<T> = { data: T; message?: string };

export const teamApi = {
  create: (data: { name: string; description?: string }) =>
    apiClient.post("/teams", data) as Promise<DataResponse<Team>>,

  getMyTeams: () =>
    apiClient.get("/teams") as Promise<DataResponse<Team[]>>,

  getTeam: (teamId: string) =>
    apiClient.get(`/teams/${teamId}`) as Promise<DataResponse<Team>>,

  update: (teamId: string, data: { name?: string; description?: string }) =>
    apiClient.put(`/teams/${teamId}`, data) as Promise<DataResponse<Team>>,

  delete: (teamId: string) =>
    apiClient.delete(`/teams/${teamId}`),

  inviteMember: (teamId: string, email: string) =>
    apiClient.post(`/teams/${teamId}/members`, { email }),

  removeMember: (teamId: string, userId: string) =>
    apiClient.delete(`/teams/${teamId}/members/${userId}`),

  leaveTeam: (teamId: string) =>
    apiClient.delete(`/teams/${teamId}/members/me`),
};
