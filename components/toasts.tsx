"use client";

import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useLedgr } from "@/lib/ledgr-provider";

export function ToastViewport() {
  const { toasts, dismissToast } = useLedgr();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "danger" ? AlertCircle : Info;
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="pointer-events-auto flex items-start gap-3 rounded-3xl border bg-[var(--surface-elevated)] p-4 text-left shadow-[var(--shadow)]"
          >
            <Icon
              className={
                toast.tone === "success"
                  ? "text-[var(--success)]"
                  : toast.tone === "danger"
                    ? "text-[var(--danger)]"
                    : "text-[var(--accent)]"
              }
              size={18}
            />
            <p className="font-inter text-sm font-medium text-[var(--text-primary)]">{toast.title}</p>
          </button>
        );
      })}
    </div>
  );
}
