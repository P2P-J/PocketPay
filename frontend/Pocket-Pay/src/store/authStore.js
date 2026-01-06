// src/store/authStore.js
import { create } from "zustand";

const STORAGE_USER_KEY = "user";
const STORAGE_TOKEN_KEY = "accessToken";

export const useAuthStore = create((set) => ({
  // =======================
  // 상태
  // =======================
  user: null,          // { id, email, name, provider }
  accessToken: null,   // 백엔드에서 받은 JWT 등
  loading: false,

  // =======================
  // 상태 세터 (필요 시 직접 쓸 수 있게 남겨둠)
  // =======================
  setUser: (user) => {
    set({ user });
    try {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error("Failed to save user to localStorage:", error);
    }
  },

  setAccessToken: (token) => {
    set({ accessToken: token });
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
    } catch (error) {
      console.error("Failed to save token to localStorage:", error);
    }
  },

  // =======================
  // 앱 처음 켰을 때 / 새로고침 후: 로그인 상태 복원
  // =======================
  checkAuth: () => {
    set({ loading: true });
    try {
      const savedUser = localStorage.getItem(STORAGE_USER_KEY);
      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);

      if (savedUser && savedToken) {
        set({
          user: JSON.parse(savedUser),
          accessToken: savedToken,
          loading: false,
        });
      } else {
        set({
          user: null,
          accessToken: null,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Check auth error:", error);
      set({
        user: null,
        accessToken: null,
        loading: false,
      });
    }
  },

  // =======================
  // 로그아웃
  // =======================
  logout: () => {
    try {
      localStorage.removeItem(STORAGE_USER_KEY);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
    } catch (error) {
      console.error("Logout localStorage clear error:", error);
    }
    set({ user: null, accessToken: null });
  },

  // =======================
  // 로그인 성공 처리 (AuthScreen에서 호출)
  // =======================
  // AuthScreen에서:
  //   const loginStore = useAuthStore((state) => state.login);
  //   loginStore({ id, email, name, provider }, token);
  login: (user, token) => {
    set({
      user,
      accessToken: token,
      loading: false,
    });

    try {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
    } catch (error) {
      console.error("Login persist error:", error);
    }
  },
}));