import { apiClient } from "./client";
import type { Deal, DealPayload } from "@/types/transaction";

export const dealApi = {
  create: (data: DealPayload) =>
    apiClient.post("/deals", data) as Promise<{ message: string; data: Deal }>,

  getMonthly: (teamId: string, year: number, month: number) =>
    apiClient.get(
      `/deals?teamId=${teamId}&year=${year}&month=${month}`
    ) as Promise<{ data: Deal[] }>,

  getDetail: (dealId: string) =>
    apiClient.get(`/deals/${dealId}`) as Promise<{ data: Deal }>,

  update: (dealId: string, data: Partial<DealPayload>) =>
    apiClient.put(`/deals/${dealId}`, data),

  delete: (dealId: string) =>
    apiClient.delete(`/deals/${dealId}`),

  getSummary: (teamId: string) =>
    apiClient.get(`/deals/summary/${teamId}`) as Promise<{
      data: { income: number; expense: number; balance: number };
    }>,

  getMonthlyStats: (teamId: string, year: number, month: number) =>
    apiClient.get(
      `/deals/stats/${teamId}?year=${year}&month=${month}`
    ) as Promise<{
      data: {
        current: { income: number; expense: number };
        previous: { income: number; expense: number };
        incomeChange: number;
        expenseChange: number;
        categoryBreakdown: { category: string; total: number }[];
        topCategory: { category: string; total: number } | null;
      };
    }>,
};
