import { create } from "zustand";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { localStorageUtil } from "../utils/localStorage";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-ef8e7ba7`;

export const useTeamStore = create((set, get) => ({
  currentTeam: null,
  teams: [],
  transactions: [],
  categories: [],
  loading: false,

  loadLocalTeams: () => {
    const localTeams = localStorageUtil.get("teams") || [];
    set({ teams: localTeams });

    // 첫 번째 팀을 현재 팀으로 설정
    if (localTeams.length > 0 && !get().currentTeam) {
      const firstTeam = localTeams[0];
      set({ currentTeam: firstTeam });

      // 해당 팀의 거래 내역 로드
      const teamTransactions =
        localStorageUtil.get(`transactions-${firstTeam.id}`) || [];
      set({ transactions: teamTransactions });
    }
  },

  fetchTeams: async (accessToken) => {
    set({ loading: true });
    try {
      const response = await fetch(`${API_BASE}/teams`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch teams");
      }

      const data = await response.json();
      set({ teams: data.teams, loading: false });

      // Set current team to first team if not set
      if (data.teams.length > 0 && !get().currentTeam) {
        set({ currentTeam: data.teams[0] });
      }
    } catch (error) {
      console.error("Fetch teams error:", error);
      set({ loading: false });
    }
  },

  createTeam: async (accessToken, name, description) => {
    set({ loading: true });
    try {
      // 로컬 팀 생성 (accessToken이 없을 경우)
      if (!accessToken) {
        const newTeam = {
          id: `temp-team-${Date.now()}`,
          name,
          description: description || "",
          current_balance: 0,
          owner_id: "temp-user",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedTeams = [...get().teams, newTeam];

        // 로컬스토리지에 저장
        localStorageUtil.set("teams", updatedTeams);
        localStorageUtil.set(`transactions-${newTeam.id}`, []);

        set((state) => ({
          teams: updatedTeams,
          currentTeam: newTeam,
          transactions: [], // 새 팀으로 전환 시 거래 내역 초기화
          loading: false,
        }));
        return;
      }

      const response = await fetch(`${API_BASE}/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        throw new Error("Failed to create team");
      }

      const data = await response.json();
      set((state) => ({
        teams: [...state.teams, data.team],
        currentTeam: data.team,
        transactions: [], // 새 팀으로 전환 시 거래 내역 초기화
        loading: false,
      }));
    } catch (error) {
      console.error("Create team error:", error);
      set({ loading: false });
      throw error;
    }
  },

  setCurrentTeam: (teamId) => {
    const team = get().teams.find((t) => t.id === teamId);
    if (team) {
      set({ currentTeam: team });

      // 해당 팀의 거래 내역 로드
      const teamTransactions =
        localStorageUtil.get(`transactions-${team.id}`) || [];
      set({ transactions: teamTransactions });
    }
  },

  loadTeamTransactions: (teamId) => {
    const localTransactions =
      localStorageUtil.get(`transactions-${teamId}`) || [];
    set({ transactions: localTransactions });
  },

  fetchTransactions: async (accessToken, teamId, month) => {
    set({ loading: true });
    try {
      const url = month
        ? `${API_BASE}/transactions/${teamId}?month=${month}`
        : `${API_BASE}/transactions/${teamId}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      set({ transactions: data.transactions, loading: false });
    } catch (error) {
      console.error("Fetch transactions error:", error);
      set({ loading: false });
    }
  },

  createTransaction: async (accessToken, transactionData) => {
    set({ loading: true });
    try {
      // 임시 로컬 데이터로 저장 (백엔드 설정 전)
      if (!accessToken) {
        const currentTeam = get().currentTeam;
        if (!currentTeam) {
          throw new Error("No current team");
        }

        // 로그인 안 한 경우 로컬에만 저장
        const newTransaction = {
          id: `temp-${Date.now()}`,
          team_id: transactionData.team_id || currentTeam.id,
          type: transactionData.type,
          price: transactionData.price,
          store_name: transactionData.store_name,
          description: transactionData.description,
          business_number: transactionData.business_number,
          transaction_date: transactionData.transaction_date,
          balance_after:
            currentTeam.current_balance +
            (transactionData.type === "income"
              ? transactionData.price
              : -transactionData.price),
          created_by: "temp-user",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category_id: transactionData.category_id,
        };

        const updatedTransactions = [newTransaction, ...get().transactions];
        const updatedTeam = {
          ...currentTeam,
          current_balance: newTransaction.balance_after,
        };

        // 로컬스토리지에 저장
        localStorageUtil.set(
          `transactions-${currentTeam.id}`,
          updatedTransactions
        );

        // 팀 목록에서도 잔액 업데이트
        const updatedTeams = get().teams.map((t) =>
          t.id === currentTeam.id ? updatedTeam : t
        );
        localStorageUtil.set("teams", updatedTeams);

        set({
          transactions: updatedTransactions,
          currentTeam: updatedTeam,
          teams: updatedTeams,
          loading: false,
        });
        return;
      }

      const response = await fetch(`${API_BASE}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }

      const data = await response.json();

      // Update transactions list
      set((state) => ({
        transactions: [data.transaction, ...state.transactions],
        loading: false,
      }));

      // Update current team balance
      if (get().currentTeam) {
        set((state) => ({
          currentTeam: state.currentTeam
            ? {
                ...state.currentTeam,
                current_balance: data.transaction.balance_after,
              }
            : null,
        }));
      }
    } catch (error) {
      console.error("Create transaction error:", error);
      set({ loading: false });
      throw error;
    }
  },

  deleteTransaction: async (accessToken, transactionId) => {
    set({ loading: true });
    try {
      // 로컬 삭제 (accessToken이 없을 경우)
      if (!accessToken) {
        set((state) => ({
          transactions: state.transactions.filter(
            (t) => t.id !== transactionId
          ),
          loading: false,
        }));
        return;
      }

      const response = await fetch(
        `${API_BASE}/transactions/${transactionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }

      // Remove from state
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

  fetchCategories: async (accessToken, teamId) => {
    try {
      const response = await fetch(`${API_BASE}/categories/${teamId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = await response.json();
      set({ categories: data.categories });
    } catch (error) {
      console.error("Fetch categories error:", error);
    }
  },
}));
