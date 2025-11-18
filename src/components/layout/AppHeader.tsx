import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { supabaseClient } from "@/db/supabase.client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/generate", label: "Generate AI" },
  { href: "/tags", label: "Tags" },
];

export function AppHeader() {
  const { user, setUser } = useApp();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pathname, setPathname] = useState("/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        toast.error("Nie udało się wylogować");
        console.error("Logout error:", error);
        return;
      }

      setUser(null);
      localStorage.removeItem("onboarding_completed");
      toast.success("Wylogowano pomyślnie");
      window.location.href = "/auth/login";
    } catch (error) {
      toast.error("Wystąpił błąd podczas wylogowywania");
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <a href="/" className="text-lg font-semibold tracking-tight text-foreground">
            10xCards
          </a>
          <div className="flex items-center gap-1 sm:hidden">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <a
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {label}
                </a>
              );
            })}
          </div>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <a
                key={href}
                href={href}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {label}
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <span className="body-sm hidden rounded-full border border-border/80 bg-card/80 px-3 py-1 text-muted-foreground sm:inline-flex">
              {user.email}
            </span>
          ) : null}
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="subtle"
            size="sm"
            className="min-w-[120px] justify-center"
          >
            {isLoggingOut ? "Wylogowywanie..." : "Wyloguj"}
          </Button>
        </div>
      </div>
    </header>
  );
}
