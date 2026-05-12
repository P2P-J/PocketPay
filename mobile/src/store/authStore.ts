import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { authApi } from "@/api/auth";
import { setAuthStateGetter } from "@/api/client";
import type { User } from "@/types/user";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;

  setAccessToken: (token: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (accessToken: string, refreshToken: string) => Promise<void>;
  signup: (data: {
    name: string;
    nickname: string;
    handle: string;
    email: string;
    password: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // API 클라이언트에 상태 getter 연결
  setAuthStateGetter(() => ({
    accessToken: get().accessToken,
    refreshToken: get().refreshToken,
    setAccessToken: get().setAccessToken,
    logout: get().logout,
  }));

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    loading: false,
    error: null,

    setAccessToken: async (token: string) => {
      set({ accessToken: token });
      await SecureStore.setItemAsync("accessToken", token);
    },

    checkAuth: async () => {
      set({ loading: true });
      try {
        const savedAccessToken = await SecureStore.getItemAsync("accessToken");
        const savedRefreshToken = await SecureStore.getItemAsync("refreshToken");

        if (!savedAccessToken) {
          set({ loading: false });
          return;
        }

        set({ accessToken: savedAccessToken, refreshToken: savedRefreshToken });

        const userData = await authApi.me();
        set({
          user: userData,
          loading: false,
        });
      } catch {
        // 토큰 만료 또는 무효
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          loading: false,
        });
      }
    },

    login: async (email: string, password: string) => {
      set({ loading: true, error: null });
      try {
        const { accessToken, refreshToken } = await authApi.login({ email, password });
        await SecureStore.setItemAsync("accessToken", accessToken);
        await SecureStore.setItemAsync("refreshToken", refreshToken);
        set({ accessToken, refreshToken });

        const userData = await authApi.me();
        set({ user: userData, loading: false });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "로그인에 실패했습니다.";
        set({ error: message, loading: false });
        throw err;
      }
    },

    loginWithOAuth: async (accessToken: string, refreshToken: string) => {
      set({ loading: true, error: null });
      try {
        await SecureStore.setItemAsync("accessToken", accessToken);
        await SecureStore.setItemAsync("refreshToken", refreshToken);
        set({ accessToken, refreshToken });

        const userData = await authApi.me();
        set({ user: userData, loading: false });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "소셜 로그인에 실패했습니다.";
        set({ error: message, loading: false });
        throw err;
      }
    },

    signup: async (data) => {
      set({ loading: true, error: null });
      try {
        await authApi.signup(data);
        set({ loading: false });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "회원가입에 실패했습니다.";
        set({ error: message, loading: false });
        throw err;
      }
    },

    refreshUser: async () => {
      try {
        const me = await authApi.me();
        const id = me.id || me._id;
        set({
          user: {
            userId: id,
            _id: me._id,
            id: me.id,
            name: me.name,
            nickname: me.nickname,
            handle: me.handle,
            handleChangedAt: me.handleChangedAt,
            account: me.account,
            pushTokens: me.pushTokens,
            notificationsLastViewedAt: me.notificationsLastViewedAt,
            email: me.email,
            provider: me.provider,
          },
        });
      } catch {
        // 비치명적 — 조용히 실패
      }
    },

    logout: async () => {
      // 현재 디바이스의 push token을 백엔드에서 제거
      // (다른 사용자가 같은 기기로 로그인 후 이전 알림 받는 것 방지)
      try {
        const { registerForPushNotifications } = await import("@/lib/push");
        const { accountApi } = await import("@/api/account");
        const token = await registerForPushNotifications();
        if (token) {
          await accountApi.removePushToken(token).catch(() => {});
        }
      } catch {
        // 비치명적 — logout 계속 진행
      }

      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        error: null,
      });
    },
  };
});
