import { create } from "zustand";
import { teamApi } from "@features/team/api/teamApi";
import { dealApi } from "@features/transaction/api/dealApi";
import { dealToTransaction, transactionToDealPayload } from "@entities/transaction";
import { getTeamId, isMatchingTeam } from "@entities/team";

export const useTeamStore = create((set, get) => ({
  currentTeam: null,
  teams: [],
  transactions: [],
  loading: false,

  fetchTeams: async () => {
    set({ loading: true });
    try {
      const response = await teamApi.getMyTeams();
      // Backend returns { data: teams }
      const teams =
        response.data ||
        (Array.isArray(response) ? response : response.teams || []);

      set({ teams: teams, loading: false });

      if (teams.length > 0 && !get().currentTeam) {
        get().setCurrentTeam(getTeamId(teams[0]));
      }
    } catch (error) {
      console.error("Fetch teams error:", error);
      set({ loading: false });
    }
  },

  createTeam: async (name, description) => {
    set({ loading: true });
    try {
      const response = await teamApi.create({ name, description });
      // Backend returns object directly: res.status(201).json(team)
      const newTeam = response.team || response;

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

  setCurrentTeam: (teamId) => {
    const team = get().teams.find((t) => isMatchingTeam(t, teamId));
    if (team) {
      set({ currentTeam: team });
      get().fetchTransactions(getTeamId(team));
      get().fetchTeamDetails(getTeamId(team));
    }
  },

  fetchTeamDetails: async (teamId) => {
    try {
      const response = await teamApi.getTeam(teamId);
      // Backend returns { data: team } with populated members
      const detailedTeam = response.data || response;

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

  deleteTeam: async (teamId) => {
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
        get().setCurrentTeam(getTeamId(remainingTeams[0]));
      }
    } catch (error) {
      console.error("Delete team error:", error);
      set({ loading: false });
      throw error;
    }
  },

  fetchTransactions: async (teamId, year, month) => {
    set({ loading: true });
    try {
      // Default to current date if not provided
      const now = new Date();
      const y = year || now.getFullYear();
      const m = month || now.getMonth() + 1;

      const response = await dealApi.getMonthly(teamId, y, m);
      const deals = response.data || [];
      const transactions = deals.map(dealToTransaction);

      set({ transactions, loading: false });
    } catch (error) {
      console.error("Fetch transactions error:", error);
      set({ loading: false });
    }
  },

  createTransaction: async (transactionData) => {
    set({ loading: true });
    try {
      const currentTeam = get().currentTeam;
      if (!currentTeam) throw new Error("No current team selected");

      const payload = transactionToDealPayload(transactionData, getTeamId(currentTeam));
      const response = await dealApi.create(payload);
      const newTransaction = dealToTransaction(response.data);

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

  updateTransaction: async (transactionId, transactionData) => {
    set({ loading: true });
    try {
      const payload = transactionToDealPayload(transactionData);
      const response = await dealApi.update(transactionId, payload);
      const updatedTransaction = dealToTransaction(response.data);

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

  leaveTeam: async (teamId) => {
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

  deleteTransaction: async (transactionId) => {
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
