import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { supabaseClient } from "@/db/supabase.client";
import { toast } from "sonner";

export function Navigation() {
  const { user, setUser } = useApp();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        toast.error("Failed to logout");
        console.error("Logout error:", error);
        return;
      }

      // Clear user from context
      setUser(null);

      // Clear onboarding status
      localStorage.removeItem('onboarding_completed');

      toast.success("Logged out successfully");

      // Redirect to login page or reload to trigger auth flow
      window.location.href = "/auth/login";
    } catch (error) {
      toast.error("An error occurred during logout");
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="text-xl font-bold text-card-foreground">
              10xCards
            </a>
            <div className="hidden md:flex items-center gap-4">
              <a
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </a>
              <a
                href="/generate"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Generate AI
              </a>
              <a
                href="/tags"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Tags
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
            )}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
