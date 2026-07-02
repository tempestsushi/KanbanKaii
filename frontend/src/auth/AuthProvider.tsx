import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import { AuthContext, type AuthContextValue } from './AuthContext';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configurationError, setConfigurationError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = getSupabaseClient();

      void supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
          setSession(null);
        } else {
          setSession(data.session);
        }
        setIsLoading(false);
      });

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          setSession(nextSession);
          setIsLoading(false);
        },
      );

      return () => listener.subscription.unsubscribe();
    } catch (error) {
      setConfigurationError(
        error instanceof Error ? error.message : 'Supabase is not configured',
      );
      setIsLoading(false);
      return undefined;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      configurationError,
      signOut: async () => {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [configurationError, isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
