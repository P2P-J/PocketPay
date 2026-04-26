import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";

// 백그라운드 5분 이상 머문 후 복귀 시에만 토큰 재검증
const BACKGROUND_REVALIDATE_MS = 5 * 60 * 1000;

export function useAppInit() {
  const [isReady, setIsReady] = useState(false);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const user = useAuthStore((s) => s.user);
  const fetchTeams = useTeamStore((s) => s.fetchTeams);
  const lastBackgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    async function init() {
      await checkAuth();
      setIsReady(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  // 백그라운드에서 active 복귀 시 토큰 재검증 (만료됐으면 자동 로그아웃)
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "background" || state === "inactive") {
        lastBackgroundedAt.current = Date.now();
        return;
      }
      if (state === "active" && lastBackgroundedAt.current) {
        const elapsed = Date.now() - lastBackgroundedAt.current;
        lastBackgroundedAt.current = null;
        if (elapsed >= BACKGROUND_REVALIDATE_MS) {
          checkAuth();
        }
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  return { isReady, isLoggedIn: !!user };
}
