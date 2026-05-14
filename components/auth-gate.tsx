"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useLedgr } from "@/lib/ledgr-provider";
import { Button, Card, Input } from "@/components/ui";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, signIn, loading, supabaseReady } = useLedgr();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!supabaseReady) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 text-[var(--danger)]" size={18} />
            <div>
              <h1 className="font-outfit text-2xl font-extrabold">Supabase configuration is missing</h1>
              <p className="font-inter mt-2 text-sm font-medium leading-6 text-[var(--text-secondary)]">
                Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to run the web app against your Ledgr database.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center font-inter text-sm font-medium text-[var(--text-secondary)]">Loading Ledgr…</div>;
  }

  if (user) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <p className="font-inter text-xs font-bold uppercase tracking-[0.28em] text-[var(--text-muted)]">Ledgr by Ledgr Inc</p>
        <h1 className="font-outfit mt-2 text-4xl font-extrabold text-[var(--text-primary)]">Web access</h1>
        <p className="font-inter mt-3 text-sm font-medium leading-6 text-[var(--text-secondary)]">
          Sign in with email and password to access your budgets, bills, grocery lists, and month-end rollover flow.
        </p>

        <div className="mt-6 flex rounded-2xl border bg-[var(--surface-bg)] p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-[18px] px-4 py-3 font-outfit text-sm font-extrabold ${mode === "login" ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)]"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-[18px] px-4 py-3 font-outfit text-sm font-extrabold ${mode === "signup" ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)]"}`}
          >
            Sign Up
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>

        {error ? <p className="font-inter mt-3 text-sm font-bold text-[var(--danger)]">{error}</p> : null}

        <Button
          className="mt-5 w-full"
          disabled={submitting || !email || password.length < 6}
          onClick={async () => {
            setSubmitting(true);
            setError(null);
            const result = await signIn(email, password, mode);
            if (result.error) setError(result.error);
            setSubmitting(false);
          }}
        >
          {submitting ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </Button>
      </Card>
    </div>
  );
}
