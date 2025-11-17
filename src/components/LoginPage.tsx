import { AppProvider, useApp } from "@/contexts/AppContext";
import { AuthCard } from "./AuthCard";
import type { AuthMode } from "./AuthCard";

interface LoginPageProps {
  mode?: AuthMode;
  showHeader?: boolean;
}

function LoginContent({ mode = "signin", showHeader = true }: LoginPageProps) {
  const { setUser } = useApp();

  return <AuthCard onAuthSuccess={setUser} initialMode={mode} showHeader={showHeader} />;
}

export function LoginPage({ mode = "signin", showHeader = true }: LoginPageProps) {
  return (
    <AppProvider>
      <LoginContent mode={mode} showHeader={showHeader} />
    </AppProvider>
  );
}
