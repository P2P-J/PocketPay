import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  loading: false,

  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
  login: async (email, password) => {
    set({ loading: true });
    try {
      // 로그인 로직 구현
      set({ loading: false });
    } catch (error) {
      console.error("Login error:", error);
      set({ loading: false });
    }
  },
}));
