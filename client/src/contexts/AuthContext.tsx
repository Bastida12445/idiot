import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { apiBaseUrl } from "../lib/api";

interface AuthValue {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminChecked: boolean;
  adminCheckError: string | null;
  adminCheckStatus: number | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}
const Context = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);
  const [adminCheckStatus, setAdminCheckStatus] = useState<number | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setAdminChecked(true);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        if (active) {
          setSession(next);
          setAdminChecked(false);
          setIsAdmin(false);
          setAdminCheckError(null);
          setAdminCheckStatus(null);
        }
      },
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session?.access_token) {
      setIsAdmin(false);
      setAdminCheckError(null);
      setAdminCheckStatus(null);
      setAdminChecked(true);
      return () => {
        active = false;
      };
    }
    setAdminChecked(false);
    setAdminCheckError(null);
    setAdminCheckStatus(null);
    void fetch(
      `${apiBaseUrl}/api/auth/me`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    )
      .then((response) => {
        if (!response.ok) {
          if (active) {
            setIsAdmin(false);
            setAdminCheckStatus(response.status);
            setAdminCheckError(
              response.status === 403
                ? "The API says this account does not have an administrator profile."
                : `The API could not verify administrator access (HTTP ${response.status}). Check the API server logs.`,
            );
          }
          return;
        }
        return response.json();
      })
      .then((body) => {
        if (active && body) {
          setIsAdmin(true);
          setAdminCheckError(null);
        }
      })
      .catch(() => {
        if (active) {
          setIsAdmin(false);
          setAdminCheckStatus(null);
          setAdminCheckError(
            `Could not reach the API at ${apiBaseUrl}. Verify the API is running and that CLIENT_ORIGIN includes ${window.location.origin}.`,
          );
        }
      })
      .finally(() => {
        if (active) setAdminChecked(true);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      isAdmin,
      adminChecked,
      adminCheckError,
      adminCheckStatus,
      signIn: async (email, password) => {
        if (!supabase)
          throw new Error(
            "Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values.",
          );
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      signOut: async () => {
        if (supabase) {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        }
      },
      resetPassword: async (email) => {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
      },
      updatePassword: async (password) => {
        if (!supabase) throw new Error("Supabase is not configured.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
    }),
    [session, loading, isAdmin, adminChecked, adminCheckError, adminCheckStatus],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
