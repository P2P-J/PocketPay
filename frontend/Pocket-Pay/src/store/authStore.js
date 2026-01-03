import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  loading: false,

  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ accessToken: token }),
  logout: () => set({ user: null, accessToken: null }),
  
  checkAuth: async () => {
    set({ loading: true });
    try {
      // 로컬 스토리지에서 토큰 확인
      const token = localStorage.getItem('accessToken');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        set({ 
          accessToken: token, 
          user: JSON.parse(user),
          loading: false 
        });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      set({ loading: false });
    }
  },
  
  login: async (email, password) => {
    set({ loading: true });
    try {
      // 로그인 로직 구현
      set({ loading: false });
    } catch (error) {
      console.error('Login error:', error);
      set({ loading: false });
    }
  },
}));
