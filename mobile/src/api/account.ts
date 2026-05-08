import { apiClient } from "./client";

type DataResponse<T> = { data: T; message?: string };

type ProfileResponse = {
  id: string;
  email: string;
  name: string;
  nickname: string;
  handle?: string;
  handleChangedAt?: string;
  provider: string;
};

export const accountApi = {
  checkHandle: (handle: string) =>
    apiClient.get(
      `/account/check-handle?handle=${encodeURIComponent(handle)}`
    ) as Promise<
      DataResponse<{ available: boolean; reason?: "format" | "taken" }>
    >,

  updateProfile: (data: { name?: string; nickname?: string }) =>
    apiClient.patch("/account/profile", data) as Promise<
      DataResponse<ProfileResponse>
    >,

  updateHandle: (handle: string) =>
    apiClient.patch("/account/handle", { handle }) as Promise<
      DataResponse<ProfileResponse>
    >,
};
