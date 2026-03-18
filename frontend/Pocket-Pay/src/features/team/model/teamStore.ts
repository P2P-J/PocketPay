import { create } from "zustand";
import { teamApi } from "@features/team/api/teamApi";
import { dealApi } from "@features/transaction/api/dealApi";
import { dealToTransaction, transactionToDealPayload } from "@entities/transaction";
import { getTeamId, isMatchingTeam } from "@entities/team";
import type { Transaction } from "@entities/transaction/model";
import type { Team } from "@entities/team/model";

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string;
}

interface TeamState {
  currentTeam: Team | null;
  teams: Team[];
  transactions: Transaction[];
  loading: boolean;
  categories: Category[];
  fetchTeams: () => Promise<void>;
  createTeam: (name: string, description: string) => Promise<void>;
  setCurrentTeam: (teamId: string) => void;
  fetchTeamDetails: (teamId: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  fetchTransactions: (teamId: string, year?: number, month?: number) => Promise<void>;
  createTransaction: (transactionData: Transaction) => Promise<Transaction>;
  updateTransaction: (transactionId: string, transactionData: Transaction) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<boolean>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  fetchCategories: (...args: unknown[]) => Promise<void>;
  reset: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  currentTeam: null,
  teams: [],
  transactions: [],
  loading: false,

  fetchTeams: async () => {
    set({ loading: true });
    try {
      const response = await teamApi.getMyTeams() as { data?: Team[]; teams?: Team[] } | Team[];
      // Backend returns { data: teams }
      const teams: Team[] =
        (response as { data?: Team[] }).data ||
        (Array.isArray(response) ? response : (response as { teams?: Team[] }).teams || []);

      set({ teams: teams, loading: false });

      if (teams.length > 0 && !get().currentTeam) {
        get().setCurrentTeam(getTeamId(teams[0])!);
      }
    } catch (error) {
      console.error("Fetch teams error:", error);
      set({ loading: false });
    }
  },

  createTeam: async (name: string, description: string) => {
    set({ loading: true });
    try {
      const response = await teamApi.create({ name, description }) as { team?: Team } & Team;
      // Backend returns object directly: res.status(201).json(team)
      const newTeam: Team = response.team || response;

      set((state) => ({
        teams: [...state.teams, newTeam],
        currentTeam: newTeam,
        transactions: [],
        loading: false,
      }));
    } catch (error) {
      console.error("Create team error:", error);
      set({ loading: false });
      throw error;
    }
  },

  setCurrentTeam: (teamId: string) => {
    const team = get().teams.find((t) => isMatchingTeam(t, teamId));
    if (team) {
      set({ currentTeam: team });
      get().fetchTransactions(getTeamId(team)!);
      get().fetchTeamDetails(getTeamId(team)!);
    }
  },

  fetchTeamDetails: async (teamId: string) => {
    try {
      const response = await teamApi.getTeam(teamId) as { data?: Team } | Team;
      // Backend returns { data: team } with populated members
      const detailedTeam: Team = (response as { data?: Team }).data || (response as Team);

      set({ currentTeam: detailedTeam });

      set((state) => ({
        teams: state.teams.map((t) =>
          isMatchingTeam(t, teamId) ? detailedTeam : t
        ),
      }));
    } catch (error) {
      console.error("Fetch team details error:", error);
    }
  },

  deleteTeam: async (teamId: string) => {
    set({ loading: true });
    try {
      await teamApi.delete(teamId);

      set((state) => {
        const wasCurrent = isMatchingTeam(state.currentTeam, teamId);
        return {
          teams: state.teams.filter((t) => !isMatchingTeam(t, teamId)),
          currentTeam: wasCurrent ? null : state.currentTeam,
          transactions: wasCurrent ? [] : state.transactions,
          loading: false,
        };
      });

      const remainingTeams = get().teams;
      if (remainingTeams.length > 0 && !get().currentTeam) {
        get().setCurrentTeam(getTeamId(remainingTeams[0])!);
      }
    } catch (error) {
      console.error("Delete team error:", error);
      set({ loading: false });
      throw error;
    }
  },

  fetchTransactions: async (teamId: string, year?: number, month?: number) => {
    set({ loading: true });
    try {
      // Default to current date if not provided
      const now = new Date();
      const y = year || now.getFullYear();
      const m = month || now.getMonth() + 1;

      const response = await dealApi.getMonthly(teamId, y, m) as { data?: unknown[] };
      const deals = response.data || [];
      const transactions = deals.map(dealToTransaction as (deal: unknown) => Transaction);

      set({ transactions, loading: false });
    } catch (error) {
      console.error("Fetch transactions error:", error);
      set({ loading: false });
    }
  },

  createTransaction: async (transactionData: Transaction) => {
    set({ loading: true });
    try {
      const currentTeam = get().currentTeam;
      if (!currentTeam) throw new Error("No current team selected");

      const payload = transactionToDealPayload(transactionData, getTeamId(currentTeam));
      const response = await dealApi.create(payload) as { data: unknown };
      const newTransaction = dealToTransaction(response.data as Parameters<typeof dealToTransaction>[0]);

      set((state) => ({
        transactions: [newTransaction, ...state.transactions],
        loading: false,
      }));

      return newTransaction;
    } catch (error) {
      console.error("Create transaction error:", error);
      set({ loading: false });
      throw error;
    }
  },

  updateTransaction: async (transactionId: string, transactionData: Transaction) => {
    set({ loading: true });
    try {
      const payload = transactionToDealPayload(transactionData);
      const response = await dealApi.update(transactionId, payload) as { data: unknown };
      const updatedTransaction = dealToTransaction(response.data as Parameters<typeof dealToTransaction>[0]);

      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === transactionId ? updatedTransaction : t
        ),
        loading: false,
      }));
    } catch (error) {
      console.error("Update transaction error:", error);
      set({ loading: false });
      throw error;
    }
  },

  leaveTeam: async (teamId: string) => {
    set({ loading: true });
    try {
      await teamApi.leaveTeam(teamId);

      set((state) => {
        const wasCurrent = isMatchingTeam(state.currentTeam, teamId);
        return {
          teams: state.teams.filter((t) => !isMatchingTeam(t, teamId)),
          currentTeam: wasCurrent ? null : state.currentTeam,
          transactions: wasCurrent ? [] : state.transactions,
          loading: false,
        };
      });

      return true;
    } catch (error) {
      console.error("Leave team error:", error);
      set({ loading: false });
      throw error;
    }
  },

  deleteTransaction: async (transactionId: string) => {
    set({ loading: true });
    try {
      await dealApi.delete(transactionId);
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== transactionId),
        loading: false,
      }));
    } catch (error) {
      console.error("Delete transaction error:", error);
      set({ loading: false });
      throw error;
    }
  },

  categories: [],

  // 백엔드에 카테고리 API 없음 - 모달에서 정적 기본값 사용 중
  fetchCategories: async () => {},

  reset: () => {
    set({
      currentTeam: null,
      teams: [],
      transactions: [],
      loading: false,
    });
  },
}));
