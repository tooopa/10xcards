import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabaseClient } from '@/db/supabase.client';
import type { DeckDto } from '@/types';

interface AppContextType {
  currentDeck: DeckDto | null;
  setCurrentDeck: (deck: DeckDto | null) => void;
  user: {
    id: string;
    email: string;
  } | null;
  setUser: (user: { id: string; email: string } | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [currentDeck, setCurrentDeck] = useState<DeckDto | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    // Load user from Supabase on app initialization
    const loadUser = async () => {
      try {
        const { data: { user: supabaseUser } } = await supabaseClient.auth.getUser();
        if (supabaseUser) {
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || "",
          });
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };

    loadUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AppContextType = {
    currentDeck,
    setCurrentDeck,
    user,
    setUser,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
