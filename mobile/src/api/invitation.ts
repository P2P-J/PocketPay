import { apiClient } from "./client";
import type { Invitation } from "@/types/invitation";

type DataResponse<T> = { data: T; message?: string };

export const invitationApi = {
  list: () =>
    apiClient.get("/invitations") as Promise<DataResponse<Invitation[]>>,

  accept: (teamId: string) =>
    apiClient.post(`/invitations/${teamId}/accept`) as Promise<
      DataResponse<{ success: boolean; team: unknown }>
    >,

  reject: (teamId: string) =>
    apiClient.post(`/invitations/${teamId}/reject`) as Promise<
      DataResponse<{ success: boolean }>
    >,
};
