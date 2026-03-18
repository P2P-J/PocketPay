import { LoadingScreen } from "@features/auth/ui/AuthScreen";
import { AppProviders } from "@app/providers/AppProviders";
import { AppRouter } from "@app/Router";
import { useOAuthCallback } from "@app/hooks/useOAuthCallback";
import { useAppInit } from "@app/hooks/useAppInit";

export default function App() {
  useOAuthCallback();
  const { isLoading } = useAppInit();

  if (isLoading) return <LoadingScreen />;

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
