import { create } from "zustand";
import { teamApi } from "@/api/team";
import { dealApi } from "@/api/deal";
import type { Team } from "@/types/team";
import { getTeamId } from "@/types/team";
import type { Transaction, DealPayload } from "@/types/transaction";
import { dealToTransaction, transactionToDealPayload } from "@/types/transaction";

interface Summary {
  income: number;
  expense: number;
  balance: number;
}

interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  transactions: Transaction[];
  summary: Summary;
  loading: boolean;

  fetchTeams: () => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<void>;
  setCurrentTeam: (teamId: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<void>;

  fetchSummary: (teamId: string) => Promise<void>;
  fetchTransactions: (teamId: string, year?: number, month?: number) => Promise<void>;
  createTransaction: (data: Partial<Transaction> & { teamId?: string; businessNumber?: string }) => Promise<void>;
  updateTransaction: (transactionId: string, data: Partial<DealPayload>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;

  reset: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  currentTeam: null,
  transactions: [],
  summary: { income: 0, expense: 0, balance: 0 },
  loading: false,

  fetchTeams: async () => {
    set({ loading: true });
    try {
      const res = await teamApi.getMyTeams();
      const teams = res.data || [];
      set({ teams, loading: false });

      // 현재 팀이 없으면 첫 번째 팀 선택
      if (!get().currentTeam && teams.length > 0) {
        const firstTeamId = getTeamId(teams[0]);
        await get().setCurrentTeam(firstTeamId);
      }
    } catch {
      set({ loading: false });
    }
  },

  createTeam: async (name: string, description?: string) => {
    const res = await teamApi.create({ name, description });
    const newTeam = res.data;
    set((state) => ({ teams: [...state.teams, newTeam] }));
    await get().setCurrentTeam(getTeamId(newTeam));
  },

  setCurrentTeam: async (teamId: string) => {
    set({ loading: true });
    try {
      const res = await teamApi.getTeam(teamId);
      set({ currentTeam: res.data });

      // 전체 잔액 + 현재 달 거래 동시 로드
      const now = new Date();
      await Promise.all([
        get().fetchSummary(teamId),
        get().fetchTransactions(teamId, now.getFullYear(), now.getMonth() + 1),
      ]);
    } catch {
      set({ loading: false });
    }
  },

  deleteTeam: async (teamId: string) => {
    await teamApi.delete(teamId);
    const remaining = get().teams.filter((t) => getTeamId(t) !== teamId);
    set({ teams: remaining, currentTeam: null, transactions: [], summary: { income: 0, expense: 0, balance: 0 } });

    // 남은 팀이 있으면 첫 번째 팀으로 자동 전환
    if (remaining.length > 0) {
      await get().setCurrentTeam(getTeamId(remaining[0]));
    }
  },

  leaveTeam: async (teamId: string) => {
    await teamApi.leaveTeam(teamId);
    const remaining = get().teams.filter((t) => getTeamId(t) !== teamId);
    set({ teams: remaining, currentTeam: null, transactions: [], summary: { income: 0, expense: 0, balance: 0 } });

    if (remaining.length > 0) {
      await get().setCurrentTeam(getTeamId(remaining[0]));
    }
  },

  fetchSummary: async (teamId: string) => {
    try {
      const res = await dealApi.getSummary(teamId);
      set({ summary: res.data });
    } catch {
      set({ summary: { income: 0, expense: 0, balance: 0 } });
    }
  },

  fetchTransactions: async (teamId: string, year?: number, month?: number) => {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;

    set({ loading: true });
    try {
      const res = await dealApi.getMonthly(teamId, y, m);
      const transactions = (res.data || []).map(dealToTransaction);
      set({ transactions, loading: false });
    } catch {
      set({ transactions: [], loading: false });
    }
  },

  createTransaction: async (data) => {
    const currentTeam = get().currentTeam;
    if (!currentTeam) return;

    const teamId = getTeamId(currentTeam);
    const payload = transactionToDealPayload({ ...data, teamId });
    await dealApi.create(payload);

    // 추가한 거래의 날짜 기준 월로 새로고침 (OCR 과거 날짜 대응)
    const txDate = data.date ? new Date(data.date) : new Date();
    const txYear = txDate.getFullYear();
    const txMonth = txDate.getMonth() + 1;

    await Promise.all([
      get().fetchTransactions(teamId, txYear, txMonth),
      get().fetchSummary(teamId),
    ]);
  },

  updateTransaction: async (transactionId: string, data: Partial<DealPayload>) => {
    await dealApi.update(transactionId, data);

    const currentTeam = get().currentTeam;
    if (currentTeam) {
      const teamId = getTeamId(currentTeam);
      const now = new Date();
      await Promise.all([
        get().fetchTransactions(teamId, now.getFullYear(), now.getMonth() + 1),
        get().fetchSummary(teamId),
      ]);
    }
  },

  deleteTransaction: async (transactionId: string) => {
    await dealApi.delete(transactionId);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== transactionId),
    }));

    const currentTeam = get().currentTeam;
    if (currentTeam) await get().fetchSummary(getTeamId(currentTeam));
  },

  reset: () => {
    set({ teams: [], currentTeam: null, transactions: [], summary: { income: 0, expense: 0, balance: 0 }, loading: false });
  },
}));
