import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  loading: false,

  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ accessToken: token }),

  checkAuth: () => {
    set({ loading: true });
    try {
      // 로컬스토리지에서 저장된 인증 정보 확인
      const savedUser = localStorage.getItem("user");
      const savedToken = localStorage.getItem("accessToken");

      if (savedUser && savedToken) {
        set({
          user: JSON.parse(savedUser),
          accessToken: savedToken,
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error("Check auth error:", error);
      set({ loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    set({ user: null, accessToken: null });
  },

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
