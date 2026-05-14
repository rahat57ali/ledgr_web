"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { MonthEndModal } from "@/components/month-end-modal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>
        {children}
        <MonthEndModal />
      </AppShell>
    </AuthGate>
  );
}
