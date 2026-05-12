import { create } from "zustand";
import { teamApi } from "@/api/team";
import { dealApi } from "@/api/deal";
import { invitationApi } from "@/api/invitation";
import { dutchApi } from "@/api/dutch";
import type { Team } from "@/types/team";
import { getTeamId } from "@/types/team";
import type { Transaction, DealPayload } from "@/types/transaction";
import type { Invitation } from "@/types/invitation";
import type { DutchRequestNotification } from "@/types/dutch";
import { dealToTransaction, transactionToDealPayload } from "@/types/transaction";

interface Summary {
  income: number;
  expense: number;
  balance: number;
}

// 월별 거래 캐시 키: `${teamId}:${year}-${month}` (월은 1~12 그대로)
export const monthCacheKey = (teamId: string, year: number, month: number) =>
  `${teamId}:${year}-${month}`;

interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  // 월별 거래 캐시. 화면은 자기 (teamId, year, month) 키로 직접 조회.
  transactionsByMonth: Record<string, Transaction[]>;
  summary: Summary;
  loading: boolean;
  pendingInvitations: Invitation[];
  pendingDutchRequests: DutchRequestNotification[];

  fetchTeams: () => Promise<void>;
  createTeam: (data: {
    name: string;
    description?: string;
    category?: "friend" | "club";
    displayMode?: "nickname" | "realName";
    accountMode?: "personal" | "team";
    feeEnabled?: boolean;
  }) => Promise<void>;
  setCurrentTeam: (teamId: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<void>;

  fetchSummary: (teamId: string) => Promise<void>;
  fetchTransactions: (teamId: string, year?: number, month?: number) => Promise<void>;
  createTransaction: (data: Partial<Transaction> & { teamId?: string; businessNumber?: string }) => Promise<void>;
  updateTransaction: (transactionId: string, data: Partial<DealPayload>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;

  fetchPendingInvitations: () => Promise<void>;
  acceptInvitation: (teamId: string) => Promise<void>;
  rejectInvitation: (teamId: string) => Promise<void>;

  fetchPendingDutchRequests: () => Promise<void>;
  dismissDutchRequest: (id: string) => Promise<void>;

  reset: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  currentTeam: null,
  transactionsByMonth: {},
  summary: { income: 0, expense: 0, balance: 0 },
  loading: false,
  pendingInvitations: [],
  pendingDutchRequests: [],

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

  createTeam: async (data) => {
    const res = await teamApi.create(data);
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
    // 삭제된 팀의 월별 캐시만 정리 (다른 팀 캐시는 유지)
    const byMonth = { ...get().transactionsByMonth };
    for (const k of Object.keys(byMonth)) {
      if (k.startsWith(`${teamId}:`)) delete byMonth[k];
    }
    set({ teams: remaining, currentTeam: null, transactionsByMonth: byMonth, summary: { income: 0, expense: 0, balance: 0 } });

    // 남은 팀이 있으면 첫 번째 팀으로 자동 전환
    if (remaining.length > 0) {
      await get().setCurrentTeam(getTeamId(remaining[0]));
    }
  },

  leaveTeam: async (teamId: string) => {
    await teamApi.leaveTeam(teamId);
    const remaining = get().teams.filter((t) => getTeamId(t) !== teamId);
    const byMonth = { ...get().transactionsByMonth };
    for (const k of Object.keys(byMonth)) {
      if (k.startsWith(`${teamId}:`)) delete byMonth[k];
    }
    set({ teams: remaining, currentTeam: null, transactionsByMonth: byMonth, summary: { income: 0, expense: 0, balance: 0 } });

    if (remaining.length > 0) {
      await get().setCurrentTeam(getTeamId(remaining[0]));
    }
  },

  fetchSummary: async (teamId: string) => {
    try {
      const res = await dealApi.getSummary(teamId);
      set({ summary: res.data });
    } catch (err) {
      // 실패 시 이전 summary 유지 — 0으로 덮어쓰면 사용자에게 "갑자기 잔액 0"으로 보임
      if (__DEV__) console.warn("[fetchSummary] failed:", err);
    }
  },

  fetchTransactions: async (teamId: string, year?: number, month?: number) => {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;
    const key = monthCacheKey(teamId, y, m);

    // 캐시 hit: 백그라운드 갱신 (loading false 유지, 스켈레톤 깜빡임 방지)
    // 캐시 miss: loading true 켜고 스켈레톤 노출
    const hasCache = !!get().transactionsByMonth[key];
    if (!hasCache) set({ loading: true });

    try {
      const res = await dealApi.getMonthly(teamId, y, m);
      const list = (res.data || []).map(dealToTransaction);
      set((state) => ({
        transactionsByMonth: { ...state.transactionsByMonth, [key]: list },
        loading: false,
      }));
    } catch (err) {
      // 실패 시 캐시 유지 — 빈 배열로 덮어쓰면 "거래 사라짐"으로 보임
      set({ loading: false });
      if (__DEV__) console.warn("[fetchTransactions] failed:", err);
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
    if (!currentTeam) return;

    const teamId = getTeamId(currentTeam);
    // 수정 시 month 이동 가능 → 해당 팀의 모든 월 캐시 무효화 후 현재 달 재조회
    set((state) => {
      const byMonth = { ...state.transactionsByMonth };
      for (const k of Object.keys(byMonth)) {
        if (k.startsWith(`${teamId}:`)) delete byMonth[k];
      }
      return { transactionsByMonth: byMonth };
    });
    const now = new Date();
    await Promise.all([
      get().fetchTransactions(teamId, now.getFullYear(), now.getMonth() + 1),
      get().fetchSummary(teamId),
    ]);
  },

  deleteTransaction: async (transactionId: string) => {
    await dealApi.delete(transactionId);
    // 모든 월 캐시에서 낙관적으로 제거 (어느 월에 있는지 모르므로)
    set((state) => {
      const byMonth: Record<string, Transaction[]> = {};
      for (const [k, list] of Object.entries(state.transactionsByMonth)) {
        byMonth[k] = list.filter((t) => t.id !== transactionId);
      }
      return { transactionsByMonth: byMonth };
    });

    const currentTeam = get().currentTeam;
    if (currentTeam) await get().fetchSummary(getTeamId(currentTeam));
  },

  fetchPendingInvitations: async () => {
    try {
      const res = await invitationApi.list();
      set({ pendingInvitations: res.data || [] });
    } catch (e) {
      // 비치명적, 조용히 실패
      if (__DEV__) console.warn("Failed to fetch pending invitations", e);
    }
  },

  acceptInvitation: async (teamId: string) => {
    await invitationApi.accept(teamId);
    set((s) => ({
      pendingInvitations: s.pendingInvitations.filter((p) => p.teamId !== teamId),
    }));
    await get().fetchTeams();
  },

  rejectInvitation: async (teamId: string) => {
    await invitationApi.reject(teamId);
    set((s) => ({
      pendingInvitations: s.pendingInvitations.filter((p) => p.teamId !== teamId),
    }));
  },

  fetchPendingDutchRequests: async () => {
    try {
      const res = await dutchApi.list();
      set({ pendingDutchRequests: res.data || [] });
    } catch (e) {
      if (__DEV__) console.warn("Failed to fetch dutch requests", e);
    }
  },

  dismissDutchRequest: async (id: string) => {
    await dutchApi.dismiss(id);
    set((s) => ({
      pendingDutchRequests: s.pendingDutchRequests.filter((r) => r._id !== id),
    }));
  },

  reset: () => {
    set({
      teams: [],
      currentTeam: null,
      transactionsByMonth: {},
      summary: { income: 0, expense: 0, balance: 0 },
      loading: false,
      pendingInvitations: [],
      pendingDutchRequests: [],
    });
  },
}));
