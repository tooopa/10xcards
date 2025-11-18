import type { ReactNode } from "react";
import { AppProvider } from "@/contexts/AppContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toaster } from "@/components/ui/sonner";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <AppProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 rounded bg-primary text-primary-foreground px-4 py-2"
        >
          Przejdź do treści głównej
        </a>
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
      <Toaster richColors closeButton />
    </AppProvider>
  );
}
