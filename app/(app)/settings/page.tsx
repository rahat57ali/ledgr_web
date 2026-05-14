"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, PlusCircle, Trash2, Upload } from "lucide-react";
import { exportExpenses } from "@/lib/import-export";
import { useLedgr } from "@/lib/ledgr-provider";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { Button, Card, Input, PageTitle } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export default function SettingsPage() {
  const {
    theme,
    toggleTheme,
    budgetMonth,
    budgetConfig,
    categoryBudgets,
    incomeSources,
    expenses,
    addCategory,
    deleteCategory,
    clearCompletedGroceryLists,
    importExpenseFile,
    upsertBudgetConfig,
  } = useLedgr();

  const [totalBudget, setTotalBudget] = useState(String(budgetConfig?.totalBudget ?? 0));
  const [allocations, setAllocations] = useState<Record<string, string>>(
    Object.fromEntries(categoryBudgets.map((category) => [category.name, String(category.budgetAmount)])),
  );
  const [newCategory, setNewCategory] = useState("");
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<string | null>(null);
  const [confirmClearCompleted, setConfirmClearCompleted] = useState(false);
  const [sources, setSources] = useState(
    incomeSources.length ? incomeSources.map((source) => ({ ...source, amount: String(source.amount) })) : [{ id: "manual", label: "Salary", amount: "0", isRollover: false }],
  );

  useEffect(() => {
    setTotalBudget(String(budgetConfig?.totalBudget ?? 0));
    setAllocations(Object.fromEntries(categoryBudgets.map((category) => [category.name, String(category.budgetAmount)])));
    setSources(
      incomeSources.length
        ? incomeSources.map((source) => ({ ...source, amount: String(source.amount) }))
        : [{ id: "manual", label: "Salary", amount: "0", isRollover: false }],
    );
  }, [budgetConfig?.totalBudget, categoryBudgets, incomeSources]);

  const totalAllocated = useMemo(() => Object.values(allocations).reduce((sum, value) => sum + Number(value || 0), 0), [allocations]);
  const totalIncome = useMemo(() => sources.reduce((sum, source) => sum + Number(source.amount || 0), 0), [sources]);

  return (
    <div className="space-y-6">
      <PageTitle title="Settings" subtitle="Budget configuration, custom categories, import/export, appearance, and Ledgr account metadata." />

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-outfit text-2xl font-extrabold">Appearance</h2>
            <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">Ledgr supports both strict light and strict dark mode.</p>
          </div>
          <Button variant="secondary" onClick={toggleTheme}>
            {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-outfit text-2xl font-extrabold">Budget Configuration</h2>
        <p className="font-inter mt-2 text-sm font-medium text-[var(--text-secondary)]">Everything here is scoped to {budgetMonth}.</p>
        <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Input type="number" min="0" value={totalBudget} onChange={(event) => setTotalBudget(event.target.value)} placeholder="Total budget" />
            <div className="rounded-2xl border bg-[var(--surface-bg)] p-4">
              <div className="flex items-center justify-between">
                <span className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Allocation Progress</span>
                <span className={`font-inter text-xs font-bold uppercase tracking-[0.22em] ${totalAllocated > Number(totalBudget) ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}>
                  {formatCurrency(totalAllocated)} / {formatCurrency(Number(totalBudget || 0))}
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[var(--warm-line)]">
                <div
                  className={`h-2 rounded-full ${totalAllocated > Number(totalBudget) ? "bg-[var(--danger)]" : "bg-[var(--accent-secondary)]"}`}
                  style={{ width: `${Math.min(100, (totalAllocated / Math.max(1, Number(totalBudget || 0))) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {categoryBudgets.map((category) => (
              <div key={category.id} className="rounded-2xl border bg-[var(--surface-bg)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">{category.name}</p>
                  {!DEFAULT_CATEGORIES.includes(category.name) ? (
                    pendingDeleteCategory === category.name ? (
                      <div className="flex items-center gap-2">
                        <button type="button" className="text-[var(--success)]" onClick={() => void deleteCategory(category.name).then(() => setPendingDeleteCategory(null))}>
                          Confirm
                        </button>
                        <button type="button" className="text-[var(--danger)]" onClick={() => setPendingDeleteCategory(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="text-[var(--danger)]" onClick={() => setPendingDeleteCategory(category.name)}>
                        <Trash2 size={14} />
                      </button>
                    )
                  ) : null}
                </div>
                <Input type="number" min="0" value={allocations[category.name] ?? "0"} onChange={(event) => setAllocations((current) => ({ ...current, [category.name]: event.target.value }))} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Input className="max-w-xs" placeholder="New custom category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
          <Button
            variant="secondary"
            disabled={!newCategory.trim()}
            onClick={async () => {
              await addCategory(newCategory.trim());
              setAllocations((current) => ({ ...current, [newCategory.trim()]: "0" }));
              setNewCategory("");
            }}
          >
            <PlusCircle size={16} />
          </Button>
          <Button
            onClick={() =>
              void upsertBudgetConfig({
                totalBudget: Number(totalBudget || 0),
                allocations: Object.fromEntries(Object.entries(allocations).map(([key, value]) => [key, Number(value || 0)])),
                incomeSources: sources.map((source) => ({ label: source.label, amount: Number(source.amount || 0), isRollover: source.isRollover })),
              })
            }
          >
            Save Budget
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-outfit text-2xl font-extrabold">Income Sources</h2>
        <p className="font-inter mt-2 text-sm font-medium text-[var(--text-secondary)]">Rollover appears as a read-only source once the month-end wizard creates it.</p>
        <div className="mt-5 space-y-3">
          {sources.map((source, index) => (
            <div key={source.id ?? index} className="grid gap-3 rounded-2xl border bg-[var(--surface-bg)] p-4 md:grid-cols-[1fr_180px_auto]">
              <Input value={source.label} readOnly={source.isRollover} onChange={(event) => setSources((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, label: event.target.value } : entry)))} />
              <Input type="number" value={source.amount} readOnly={source.isRollover} onChange={(event) => setSources((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, amount: event.target.value } : entry)))} />
              <Button
                variant="ghost"
                disabled={source.isRollover}
                onClick={() => setSources((current) => current.filter((_, entryIndex) => entryIndex !== index))}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Button variant="secondary" onClick={() => setSources((current) => [...current, { id: crypto.randomUUID(), label: "", amount: "0", isRollover: false }])}>
            Add Source
          </Button>
          <span className="font-outfit text-xl font-semibold">{formatCurrency(totalIncome)}</span>
        </div>
      </Card>

      <Card>
        <h2 className="font-outfit text-2xl font-extrabold">Data Management</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Button variant="secondary" className="gap-2" onClick={() => exportExpenses(expenses)}>
            <Download size={16} />
            Export XLSX
          </Button>
          <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border bg-[var(--surface-bg)] px-5 font-outfit text-sm font-extrabold">
            <Upload size={16} />
            Import CSV/XLSX
            <input type="file" accept=".csv,.xlsx" className="hidden" onChange={(event) => event.target.files?.[0] && void importExpenseFile(event.target.files[0])} />
          </label>
          {confirmClearCompleted ? (
            <div className="flex items-center gap-2 rounded-2xl border bg-[var(--surface-bg)] px-4">
              <button type="button" className="font-outfit text-sm font-extrabold text-[var(--success)]" onClick={() => void clearCompletedGroceryLists().then(() => setConfirmClearCompleted(false))}>
                Confirm
              </button>
              <button type="button" className="font-outfit text-sm font-extrabold text-[var(--danger)]" onClick={() => setConfirmClearCompleted(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmClearCompleted(true)}>
              Clear Completed Grocery Lists
            </Button>
          )}
          <div className="flex items-center rounded-2xl border bg-[var(--surface-bg)] px-4 font-inter text-sm font-bold text-[var(--text-secondary)]">
            Grocery receipts use Supabase storage. Voice memo data is intentionally not used on web.
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-outfit text-2xl font-extrabold">About</h2>
        <p className="font-inter mt-3 text-sm font-medium text-[var(--text-secondary)]">Ledgr by Ledgr Inc</p>
        <p className="font-inter mt-1 text-sm font-medium text-[var(--text-secondary)]">Version 1.0.0-web</p>
      </Card>
    </div>
  );
}
