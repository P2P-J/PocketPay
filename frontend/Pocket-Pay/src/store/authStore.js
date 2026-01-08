import { create } from "zustand";
import { authApi } from "../api/auth";
import { teamApi } from "../api/team"; // Import teamApi for checkAuth logic

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ accessToken: token }),

  checkAuth: async () => {
    set({ loading: true });
    try {
      const savedUser = localStorage.getItem("user");
      const savedToken = localStorage.getItem("accessToken");

      if (savedUser && savedToken) {
        // Optimistically set token so API client can use it
        set({ accessToken: savedToken });

        // Verify token by making a dummy authenticated call (using team list)
        // If this fails with 401, catch block will run
        await teamApi.getMyTeams();

        // If successful, set full user state
        set({
          user: JSON.parse(savedUser),
          accessToken: savedToken, // Redundant but safe
          loading: false,
        });
      } else {
        set({ user: null, accessToken: null, loading: false });
      }
    } catch (error) {
      console.error("Check auth error:", error);
      // Only logout if 401 Unauthorized (token invalid/expired)
      if (error.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        set({ user: null, accessToken: null, loading: false });
      } else {
        // For other errors (network, 500), keep the session but stop loading
        // Optional: show a toast or alert via UI, but here just stop loading
        set({ loading: false });
      }
    }
  },

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    set({ user: null, accessToken: null });
  },

  loginWithOAuth: (user, token) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(user));

    set({
      user,
      accessToken: token,
      loading: false,
      error: null,
    });
  },


  login: async (email, password) => {
    set({ loading: true });
    try {
      const response = await authApi.login({ email, password });
      const { token, ...user } = response;

      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("accessToken", token);

      set({ user, accessToken: token, loading: false });
      return true;
    } catch (error) {
      console.error("Login error:", error);
      set({ loading: false });
      throw error;
    }
  },

  signup: async (name, email, password) => {
    set({ loading: true });
    try {
      await authApi.signup({ name, email, password });
      set({ loading: false });
      return true;
    } catch (error) {
      console.error("Signup error:", error);
      set({ loading: false });
      throw error;
    }
  },
}));
