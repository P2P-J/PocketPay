import { create } from "zustand";
import { authApi } from "@features/auth/api/authApi";
import { teamApi } from "@features/team/api/teamApi";
import { useTeamStore } from "@features/team/model/teamStore";
import type { User } from "@entities/user/model";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  setAccessToken: (token: string) => void;
  checkAuth: () => Promise<void>;
  logout: () => void;
  loginWithOAuth: (user: User, accessToken: string, refreshToken: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,

  setAccessToken: (token: string) => {
    localStorage.setItem("accessToken", token);
    set({ accessToken: token });
  },

  checkAuth: async () => {
    set({ loading: true });
    try {
      const savedUser = localStorage.getItem("user");
      const savedToken = localStorage.getItem("accessToken");
      const savedRefresh = localStorage.getItem("refreshToken");

      if (savedUser && savedToken) {
        set({ accessToken: savedToken, refreshToken: savedRefresh });

        await teamApi.getMyTeams();

        set({
          user: JSON.parse(savedUser),
          loading: false,
        });
      } else {
        set({ user: null, accessToken: null, refreshToken: null, loading: false });
      }
    } catch (error: unknown) {
      if (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        useTeamStore.getState().reset();
        set({ user: null, accessToken: null, refreshToken: null, loading: false });
      } else {
        set({ loading: false });
      }
    }
  },

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    useTeamStore.getState().reset();
    set({ user: null, accessToken: null, refreshToken: null });
  },

  loginWithOAuth: (user: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));

    set({
      user,
      accessToken,
      refreshToken,
      loading: false,
      error: null,
    });
  },

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const response = await authApi.login({ email, password }) as { accessToken: string; refreshToken: string };
      const { accessToken, refreshToken } = response;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      set({ accessToken, refreshToken });

      const user = await authApi.me() as User;

      localStorage.setItem("user", JSON.stringify(user));
      set({ user, loading: false });

      return true;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  signup: async (name: string, email: string, password: string) => {
    set({ loading: true });
    try {
      await authApi.signup({ name, email, password });
      set({ loading: false });
      return true;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
}));
