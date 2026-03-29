import { apiClient } from "./client";

export interface FeePaymentRecord {
  id: string;
  amount: number;
  paidAt: string;
  note: string;
}

export interface FeeMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  payment: FeePaymentRecord | null;
}

export interface FeeStatus {
  feeAmount: number;
  feeDueDay: number;
  year: number;
  month: number;
  members: FeeMember[];
  paidCount: number;
  totalCount: number;
}

export const feeApi = {
  getStatus: (teamId: string, year: number, month: number) =>
    apiClient.get(
      `/fees/${teamId}?year=${year}&month=${month}`
    ) as Promise<{ data: FeeStatus }>,

  recordPayment: (
    teamId: string,
    data: { userId: string; year: number; month: number; amount?: number; paidAt?: string; note?: string }
  ) =>
    apiClient.post(`/fees/${teamId}`, data) as Promise<{ data: FeePaymentRecord }>,

  deletePayment: (teamId: string, paymentId: string) =>
    apiClient.delete(`/fees/${teamId}/${paymentId}`),

  updateFeeRule: (teamId: string, data: { feeAmount?: number; feeDueDay?: number }) =>
    apiClient.patch(`/fees/${teamId}/rule`, data) as Promise<{
      data: { feeAmount: number; feeDueDay: number };
    }>,
};
