"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Download, PlusCircle, Trash2, Upload, X } from "lucide-react";
import { exportExpenses } from "@/lib/import-export";
import { useLedgr } from "@/lib/ledgr-provider";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { Button, Card, Input } from "@/components/ui";
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
    groceryLists,
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
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sources, setSources] = useState(
    incomeSources.length
      ? incomeSources.map((source) => ({ ...source, amount: String(source.amount) }))
      : [{ id: "manual", label: "Salary", amount: "0", isRollover: false }],
  );

  useEffect(() => {
    setAllocations(Object.fromEntries(categoryBudgets.map((category) => [category.name, String(category.budgetAmount)])));
    setSources(
      incomeSources.length
        ? incomeSources.map((source) => ({ ...source, amount: String(source.amount) }))
        : [{ id: "manual", label: "Salary", amount: "0", isRollover: false }],
    );
  }, [categoryBudgets, incomeSources]);

  const totalIncome = useMemo(() => sources.reduce((sum, source) => sum + Number(source.amount || 0), 0), [sources]);
  useEffect(() => {
    setTotalBudget(String(totalIncome));
  }, [totalIncome]);

  const totalAllocated = useMemo(() => Object.values(allocations).reduce((sum, value) => sum + Number(value || 0), 0), [allocations]);
  const isOverAllocated = totalAllocated > Number(totalBudget || 0);
  const storageIndicator = useMemo(() => {
    const receiptCount = groceryLists.reduce((sum, list) => sum + list.receiptPaths.length, 0);
    const itemCount = groceryLists.reduce((sum, list) => sum + list.items.length, 0);
    return `${receiptCount} receipt files · ${itemCount} grocery items`;
  }, [groceryLists]);

  const hasChanges =
    JSON.stringify(Object.fromEntries(categoryBudgets.map((category) => [category.name, String(category.budgetAmount)]))) !== JSON.stringify(allocations) ||
    Number(totalBudget || 0) !== Number(budgetConfig?.totalBudget ?? 0) ||
    JSON.stringify(incomeSources.map((source) => ({ label: source.label, amount: String(source.amount), isRollover: source.isRollover }))) !==
      JSON.stringify(sources.map((source) => ({ label: source.label, amount: source.amount, isRollover: source.isRollover })));

  return (
    <div className="space-y-6">


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
            <label className="block font-inter text-sm font-bold text-[var(--text-secondary)]">
              Total Monthly Budget
              <Input type="number" min="0" value={totalBudget} readOnly placeholder="Total budget" />
            </label>
            <div className="rounded-2xl border bg-[var(--surface-bg)] p-4">
              <div className="flex items-center justify-between">
                <span className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Allocation Progress</span>
                <span className={`font-inter text-xs font-bold uppercase tracking-[0.22em] ${isOverAllocated ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}>
                  {isOverAllocated ? "OVER-ALLOCATED" : "ALLOCATED"}
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[var(--warm-line)]">
                <div
                  className={`h-2 rounded-full transition-[width] duration-300 ${isOverAllocated ? "bg-[var(--danger)]" : "bg-[var(--accent)]"}`}
                  style={{ width: `${Math.min(100, (totalAllocated / Math.max(1, Number(totalBudget || 0))) * 100)}%` }}
                />
              </div>
              <p className="font-inter mt-3 text-sm font-medium text-[var(--text-secondary)]">
                {formatCurrency(totalAllocated)} allocated · {formatCurrency(Math.abs(Number(totalBudget || 0) - totalAllocated))} {isOverAllocated ? "over" : "remaining"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {categoryBudgets.map((category) => {
              const percentage = Number(totalBudget || 0) > 0 ? ((Number(allocations[category.name] || 0) / Number(totalBudget || 0)) * 100).toFixed(1) : "0.0";
              return (
                <div key={category.id} className="rounded-2xl border bg-[var(--surface-bg)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">{category.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="font-inter text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{percentage}%</span>
                      {!DEFAULT_CATEGORIES.includes(category.name) ? (
                        pendingDeleteCategory === category.name ? (
                          <div className="flex items-center gap-2">
                            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[var(--success)]/15 text-[var(--success)]" onClick={() => void deleteCategory(category.name).then(() => setPendingDeleteCategory(null))}>
                              <Check size={14} />
                            </button>
                            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[var(--danger)]/15 text-[var(--danger)]" onClick={() => setPendingDeleteCategory(null)}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="text-[var(--danger)]" onClick={() => setPendingDeleteCategory(category.name)}>
                            <Trash2 size={14} />
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border bg-[var(--card-bg)] px-4">
                    <span className="font-inter text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">PKR</span>
                    <Input className="border-0 bg-transparent px-0" type="number" min="0" value={allocations[category.name] ?? "0"} onChange={(event) => setAllocations((current) => ({ ...current, [category.name]: event.target.value }))} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <label className="block font-inter text-sm font-bold text-[var(--text-secondary)]">
            Custom Category
            <Input className="max-w-xs" placeholder="New custom category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
          </label>
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
            disabled={savingSettings || !hasChanges}
            onClick={async () => {
              setSavingSettings(true);
              await upsertBudgetConfig({
                totalBudget: Number(totalBudget || 0),
                allocations: Object.fromEntries(Object.entries(allocations).map(([key, value]) => [key, Number(value || 0)])),
                incomeSources: sources.map((source) => ({ label: source.label, amount: Number(source.amount || 0), isRollover: source.isRollover })),
              });
              setSavingSettings(false);
            }}
          >
            {savingSettings ? "Saving..." : "Save Budget"}
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
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={async (event) => {
                if (!event.target.files?.[0]) return;
                setImporting(true);
                const result = await importExpenseFile(event.target.files[0]);
                setImportSummary(`${result.imported} imported, ${result.duplicateSkipped + result.formatSkipped} skipped`);
                event.target.value = "";
                setImporting(false);
              }}
            />
          </label>
          {confirmClearCompleted ? (
            <div className="flex items-center gap-2 rounded-2xl border bg-[var(--surface-bg)] px-4 h-12">
              <button type="button" className="text-[var(--success)]" onClick={() => void clearCompletedGroceryLists().then(() => setConfirmClearCompleted(false))}>
                <Check size={16} />
              </button>
              <button type="button" className="text-[var(--danger)]" onClick={() => setConfirmClearCompleted(false)}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmClearCompleted(true)}>
              Clear Completed Grocery Lists
            </Button>
          )}
          <div className="flex items-center rounded-2xl border bg-[var(--surface-bg)] px-4 font-inter text-sm font-bold text-[var(--text-secondary)]">
            Grocery data storage: {storageIndicator}
          </div>
        </div>
        {importing ? <p className="font-inter mt-4 text-sm font-bold text-[var(--text-secondary)]">Importing...</p> : null}
        {importSummary ? <p className="font-inter mt-4 text-sm font-bold text-[var(--accent)]">{importSummary}</p> : null}
      </Card>

      <Card>
        <h2 className="font-outfit text-2xl font-extrabold">About</h2>
        <p className="font-inter mt-3 text-sm font-medium text-[var(--text-secondary)]">Ledgr by Ledgr Inc</p>
        <p className="font-inter mt-1 text-sm font-medium text-[var(--text-secondary)]">Version 1.0.0-web</p>
      </Card>
    </div>
  );
}
