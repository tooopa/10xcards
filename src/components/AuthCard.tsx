import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabaseClient } from "@/db/supabase.client";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/ui/section-shell";
import { H2, Lead, Eyebrow } from "@/components/ui/typography";

export type AuthMode = "signin" | "signup";

// Force recompile timestamp: 1763338342899

// Debug function to test Supabase connection
const testSupabaseConnection = async () => {
  try {
    // Test basic connection
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

    // Test if we can query auth
    try {
      await supabaseClient.auth.getUser();
    } catch {
      // Log error silently
    }

    return { success: !sessionError, session: sessionData.session };
  } catch (err) {
    return { success: false, error: err };
  }
};

interface AuthCardProps {
  onAuthSuccess?: (user: { id: string; email: string }) => void;
  initialMode?: AuthMode;
  showHeader?: boolean;
}

export function AuthCard({ onAuthSuccess, initialMode = "signin", showHeader = true }: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isSignUp = mode === "signup";
  const headingText = isSignUp ? "Create your account" : "Welcome back";
  const descriptionText = isSignUp
    ? "Sign up to start generating flashcards with AI"
    : "Log in to access your decks and flashcards";

  useEffect(() => {
    setMode(initialMode);
    // Test Supabase connection on component mount
    testSupabaseConnection();
  }, [initialMode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSignUp && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Test connection first
        await testSupabaseConnection();

        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        // Check if user was created successfully
        if (data.user) {
          onAuthSuccess?.({
            id: data.user.id,
            email: data.user.email || "",
          });
          toast.success("Account created successfully!");
          handleLoginSuccess();
        } else {
          console.warn("No user in signup response:", data);
          toast.message("Account created!", {
            description: "Please sign in with your credentials.",
          });
          setMode("signin");
        }
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        if (data.user) {
          onAuthSuccess?.({
            id: data.user.id,
            email: data.user.email || "",
          });
          toast.success("Welcome back!");
          handleLoginSuccess();
        }
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const [showSuccess, setShowSuccess] = useState(false);

  const handleLoginSuccess = async () => {
    // Show success message and button instead of auto-redirect
    setShowSuccess(true);
  };

  /* const navigateToDashboard = async () => {
    try {
      // Wait for session to be confirmed and cookies to be set
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error) {
        console.error("Session error:", error);
        toast.error("Session error. Please try signing in again.");
        return;
      }

      if (!session) {
        console.warn("No session found");
        toast.error("No active session. Please sign in again.");
        return;
      }

      console.log("Session confirmed, navigating to dashboard...");
      // Use replace instead of href to avoid back button issues
      window.location.replace("/");
    } catch (err) {
      console.error("Navigation error:", err);
      toast.error("Failed to navigate to dashboard");
    }
  }; */

  const navigateToDashboard = () => {
    // Try a simple navigation first
    try {
      window.location.href = "/";
    } catch {
      toast.error("Failed to navigate to dashboard");
    }
  };

  return (
    <SectionShell className="w-full space-y-6">
      {showHeader && (
        <div className="space-y-3 text-center">
          <Eyebrow>10xCards</Eyebrow>
          <H2>{headingText}</H2>
          <Lead>{descriptionText}</Lead>
        </div>
      )}

      <div className="flex gap-2 rounded-full border border-border bg-muted/30 p-1 text-sm font-medium">
        <Button
          type="button"
          variant={mode === "signin" ? "default" : "ghost"}
          size="sm"
          className="flex-1 rounded-full"
          onClick={() => setMode("signin")}
          disabled={isLoading}
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant={mode === "signup" ? "default" : "ghost"}
          size="sm"
          className="flex-1 rounded-full"
          onClick={() => setMode("signup")}
          disabled={isLoading}
        >
          Create account
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="auth-email" className="block text-sm font-medium text-card-foreground">
            Email address
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:ring-2 focus:ring-ring"
            placeholder="name@example.com"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="auth-password" className="block text-sm font-medium text-card-foreground">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:ring-2 focus:ring-ring"
            placeholder="••••••••"
            disabled={isLoading}
          />
          {!isSignUp && (
            <p className="text-xs text-muted-foreground">
              Use the password you created during sign up. Password must be at least 6 characters long.
            </p>
          )}
        </div>

        {isSignUp && (
          <div className="space-y-2">
            <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-card-foreground">
              Confirm password
            </label>
            <input
              id="auth-confirm-password"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none transition focus:ring-2 focus:ring-ring"
              placeholder="Repeat password"
              disabled={isLoading}
            />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
        </Button>

        {/* Debug button for testing */}
        <Button
          type="button"
          variant="link"
          className="mt-2 w-full text-xs"
          onClick={async () => {
            await testSupabaseConnection();
          }}
        >
          Test Connection
        </Button>
      </form>

      {!showSuccess && (
        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => setMode(isSignUp ? "signin" : "signup")}
            disabled={isLoading}
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>
      )}

      {showSuccess && (
        <div className="text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h3 className="text-lg font-semibold">Welcome to 10xCards!</h3>
          <p className="text-sm text-muted-foreground">
            Your account has been created successfully. Click below to access your dashboard.
          </p>
          <Button onClick={navigateToDashboard} className="w-full">
            Go to Dashboard
          </Button>
        </div>
      )}
    </SectionShell>
  );
}
