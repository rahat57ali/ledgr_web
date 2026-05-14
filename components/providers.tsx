"use client";

import { LedgrProvider } from "@/lib/ledgr-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <LedgrProvider>{children}</LedgrProvider>;
}
