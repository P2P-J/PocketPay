import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";

export function useAppInit() {
  const [isReady, setIsReady] = useState(false);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const user = useAuthStore((s) => s.user);
  const fetchTeams = useTeamStore((s) => s.fetchTeams);

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

  return { isReady, isLoggedIn: !!user };
}
