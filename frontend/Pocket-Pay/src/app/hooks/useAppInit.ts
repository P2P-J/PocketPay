import { useEffect, useState } from "react";
import { useAuthStore } from "@features/auth/model/authStore";
import { useTeamStore } from "@features/team/model/teamStore";

export function useAppInit() {
  const { accessToken, checkAuth } = useAuthStore();
  const { fetchTeams } = useTeamStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false));
  }, [checkAuth]);

  useEffect(() => {
    if (accessToken) fetchTeams();
  }, [accessToken, fetchTeams]);

  return { isLoading };
}
