import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary";
import { Toaster } from "@shared/ui/sonner";

export function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {children}
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
