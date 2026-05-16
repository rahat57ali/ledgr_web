"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { generateId } from "@/lib/utils";

type ThemeMode = "dark" | "light";

interface Toast {
  id: string;
  title: string;
  tone?: "default" | "success" | "danger";
}

export interface AuthContextValue {
  supabaseReady: boolean;
  supabase: any; // Using any to avoid complex type issues across files for now
  session: Session | null;
  user: User | null;
  loading: boolean;
  theme: ThemeMode;
  toggleTheme: () => void;
  toasts: Toast[];
  pushToast: (title: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  signIn: (email: string, password: string, mode: "login" | "signup") => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const THEME_KEY = "ledgr-theme-web";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => {
    const ready = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    return ready ? createClient() : null;
  }, []);
  const supabaseReady = Boolean(supabase);
  
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (title: string, tone: Toast["tone"] = "default") => {
    const id = generateId("toast");
    setToasts((current) => [...current, { id, title, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  };

  const dismissToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem(THEME_KEY, next);
  };

  const signIn = async (email: string, password: string, mode: "login" | "signup") => {
    if (!supabase) return { error: "Supabase is not configured." };
    const response =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    if (response.error) return { error: response.error.message };
    pushToast(mode === "login" ? "Signed in successfully." : "Account created. Check your inbox if email confirmation is enabled.", "success");
    return {};
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const value = {
    supabaseReady,
    supabase,
    session,
    user,
    loading,
    theme,
    toggleTheme,
    toasts,
    pushToast,
    dismissToast,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
