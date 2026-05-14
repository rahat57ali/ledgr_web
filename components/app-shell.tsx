"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, CreditCard, LayoutDashboard, Moon, Settings, ShoppingBasket, Sun, Target, LogOut } from "lucide-react";
import { useLedgr } from "@/lib/ledgr-provider";
import { cn } from "@/lib/utils";
import { ToastViewport } from "@/components/toasts";
import { Button } from "@/components/ui";

const navItems = [
  { href: "/track", label: "Track", icon: Target },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/bills", label: "Bills", icon: CreditCard },
  { href: "/days", label: "Days", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme, overdueBillCount, signOut } = useLedgr();

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <ToastViewport />
      <div className="mx-auto flex min-h-screen max-w-[1720px]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-[var(--border-soft)] bg-[var(--tab-bg)] backdrop-blur xl:flex xl:flex-col">
          <div className="flex items-center gap-3 px-6 py-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-black">
              <ShoppingBasket size={22} />
            </div>
            <div>
              <p className="font-outfit text-2xl font-extrabold tracking-tight">Ledgr</p>
              <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Ledgr Inc</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2 px-4 py-6">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-4 py-3 transition",
                    active
                      ? "bg-[var(--accent)] text-black"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={18} />
                    <span className="font-outfit text-sm font-extrabold">{item.label}</span>
                  </span>
                  {item.href === "/bills" && overdueBillCount > 0 ? (
                    <span className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-black" : "bg-[var(--danger)]")} />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3 px-4 py-6">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-2xl border bg-[var(--surface-bg)] px-4 py-3"
            >
              {theme === "dark" ? <Sun size={18} className="text-[var(--accent)]" /> : <Moon size={18} className="text-[var(--accent-secondary)]" />}
              <span className="font-outfit text-sm font-extrabold">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>
            <Button variant="secondary" className="w-full justify-start gap-3" onClick={() => void signOut()}>
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>
        </aside>

        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[92px] border-r border-[var(--border-soft)] bg-[var(--tab-bg)] backdrop-blur md:flex xl:hidden md:flex-col">
          <div className="flex justify-center px-3 py-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-black">
              <ShoppingBasket size={20} />
            </div>
          </div>
          <nav className="flex flex-1 flex-col items-center gap-3 px-3 py-6">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-2xl transition",
                    active
                      ? "bg-[var(--accent)] text-black"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]",
                  )}
                  aria-label={item.label}
                >
                  <item.icon size={18} />
                  {item.href === "/bills" && overdueBillCount > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--danger)]" /> : null}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-3 px-3 py-6">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-[var(--surface-bg)]"
            >
              {theme === "dark" ? <Sun size={18} className="text-[var(--accent)]" /> : <Moon size={18} className="text-[var(--accent-secondary)]" />}
            </button>
          </div>
        </aside>

        <main className="w-full pb-28 md:ml-[92px] xl:ml-[280px]">
          <div className="min-h-screen px-4 py-4 md:px-8 md:py-8">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-soft)] bg-[var(--tab-bg)] px-3 py-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-6 gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2",
                  active ? "text-[var(--accent)]" : "text-[var(--text-muted)]",
                )}
              >
                <item.icon size={18} />
                <span className="font-inter text-[10px] font-bold">{item.label}</span>
                {item.href === "/bills" && overdueBillCount > 0 ? <span className="absolute right-4 top-2 h-2 w-2 rounded-full bg-[var(--danger)]" /> : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
