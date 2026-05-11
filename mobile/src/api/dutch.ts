import { apiClient } from "./client";
import type {
  CreateDutchRequestPayload,
  CreateDutchResponse,
  DutchRequestNotification,
} from "@/types/dutch";

type DataResponse<T> = { data: T; message?: string };

export const dutchApi = {
  create: (payload: CreateDutchRequestPayload) =>
    apiClient.post("/dutch-requests", payload) as Promise<
      DataResponse<CreateDutchResponse>
    >,

  list: () =>
    apiClient.get("/dutch-requests") as Promise<
      DataResponse<DutchRequestNotification[]>
    >,

  dismiss: (id: string) =>
    apiClient.post(`/dutch-requests/${id}/dismiss`) as Promise<
      DataResponse<{ success: boolean }>
    >,
};
