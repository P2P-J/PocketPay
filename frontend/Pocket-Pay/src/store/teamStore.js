import { create } from "zustand";
import { teamApi } from "../api/team";
import { dealApi } from "../api/deal";

export const useTeamStore = create((set, get) => ({
  currentTeam: null,
  teams: [],
  transactions: [],
  loading: false,

  fetchTeams: async () => {
    set({ loading: true });
    try {
      const response = await teamApi.getMyTeams();
      // Backend returns array directly: res.status(200).json(teams)
      const teams = Array.isArray(response) ? response : response.teams || [];

      set({ teams: teams, loading: false });

      if (teams.length > 0 && !get().currentTeam) {
        set({ currentTeam: teams[0] });
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
    const team = get().teams.find((t) => t.id === teamId || t._id === teamId);
    if (team) {
      set({ currentTeam: team });
      get().fetchTransactions(team.id || team._id);
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
      // Backend returns { data: deals }
      const deals = response.data || [];

      // Map backend Deal to frontend transaction format
      const transactions = deals.map((deal) => ({
        id: deal._id,
        merchant: deal.storeInfo,
        type: deal.division,
        description: deal.description,
        category: deal.category,
        amount: deal.price,
        date: deal.date,
        // Add other fields if needed
      }));

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

      // Map frontend data to backend Deal model
      const payload = {
        storeInfo: transactionData.merchant,
        division: transactionData.type,
        description: transactionData.description,
        category: transactionData.category,
        price: Number(transactionData.amount),
        date: transactionData.date,
        teamId: currentTeam.id || currentTeam._id,
      };

      const response = await dealApi.create(payload);
      const newDeal = response.data; // Backend returns { message, data: newDeal }

      const newTransaction = {
        id: newDeal._id,
        merchant: newDeal.storeInfo,
        type: newDeal.division,
        description: newDeal.description,
        category: newDeal.category,
        amount: newDeal.price,
        date: newDeal.date,
      };

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
      // Map frontend data to backend Deal model
      const payload = {
        storeInfo: transactionData.merchant,
        division: transactionData.type,
        description: transactionData.description,
        category: transactionData.category,
        price: Number(transactionData.amount),
        date: transactionData.date,
      };

      const response = await dealApi.update(transactionId, payload);
      const updatedDeal = response.data;

      const updatedTransaction = {
        id: updatedDeal._id,
        merchant: updatedDeal.storeInfo,
        type: updatedDeal.division,
        description: updatedDeal.description,
        category: updatedDeal.category,
        amount: updatedDeal.price,
        date: updatedDeal.date,
      };

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

  // Categories are seemingly not fetched from API in backend code provided (no category controller?)
  // Assuming categories are static or handled differently. Previous code had fetchCategories but backend route for categories?
  // I only saw auth, deal, team routes. No category route.
  // So I will use static categories or keep empty for now.
  categories: [],
}));
