"use client";

import { useMemo, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { useCurrentMonthExpenseSummary, useLedgr } from "@/lib/ledgr-provider";
import { getDailyAllowance, getDailyStatus, getDailyStatusDescription } from "@/lib/calculations";
import { Button, Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { TransactionSearchModal } from "@/components/transaction-search-modal";
import { getCategoryDisplayName } from "@/lib/category-label";
import { format, parseISO } from "date-fns";

const STATUS_LABELS = {
  Comfortable: "COMFORTABLE",
  "On Track": "ON TRACK",
  Tight: "TIGHT",
  Critical: "CRITICAL",
  Overspent: "OVERSPENT",
} as const;

export default function OverviewPage() {
  const { budgetConfig, categoryBudgets } = useLedgr();
  const { monthExpenses, totalSpent, categoryTotals } = useCurrentMonthExpenseSummary();
  const [showHistory, setShowHistory] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(legendRef, showLegend);
  const remaining = (budgetConfig?.totalBudget ?? 0) - totalSpent;
  const dailyAllowance = useMemo(() => getDailyAllowance(budgetConfig?.totalBudget ?? 0, totalSpent), [budgetConfig?.totalBudget, totalSpent]);
  const dailyStatus = getDailyStatus(budgetConfig?.totalBudget ?? 0, totalSpent);
  const recentTransactions = useMemo(() => monthExpenses.slice(0, 10), [monthExpenses]);
  const editingExpense = monthExpenses.find((e) => e.id === editingExpenseId) ?? null;

  return (
    <div className="space-y-6">


      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "BUDGET", amount: budgetConfig?.totalBudget ?? 0, negative: false },
          { label: "SPENT", amount: totalSpent, negative: false },
          { label: "REMAINING", amount: remaining, negative: remaining < 0 },
        ].map((item) => (
          <Card key={item.label}>
            <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">{item.label}</p>
            <p className="font-inter mt-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">PKR</p>
            <p className={`font-outfit mt-1 text-3xl font-extrabold ${item.negative ? "text-[var(--danger)]" : "text-[var(--text-primary)]"}`}>
              {Math.abs(item.amount).toLocaleString()}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Daily Allowance</p>
            <p className="font-outfit mt-3 text-4xl font-extrabold">{formatCurrency(dailyAllowance)}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowLegend(true)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-3 font-outfit text-sm font-extrabold ${
              dailyStatus === "Comfortable"
                ? "bg-[var(--success)]/15 text-[var(--success)]"
                : dailyStatus === "On Track"
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : dailyStatus === "Tight"
                    ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                    : dailyStatus === "Critical"
                      ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                      : "bg-[var(--danger)]/15 text-[var(--danger)]"
            }`}
          >
            <Info size={16} />
            {STATUS_LABELS[dailyStatus]}
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-outfit text-2xl font-extrabold">Category Remaining</h2>
            <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">All calculations are filtered to the current budget month only.</p>
          </div>
          <span className="font-inter text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{monthExpenses.length} transactions</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categoryBudgets.filter((category) => !category.isDeleted).map((category) => {
            const spent = categoryTotals[category.name] ?? 0;
            const remainingAmount = category.budgetAmount - spent;
            const percent = Math.min(100, Math.round((spent / Math.max(1, category.budgetAmount)) * 100));
            const tint =
              remainingAmount < 0
                ? "bg-[var(--danger)]/10"
                : percent > 85
                  ? "bg-[var(--warning)]/10"
                  : "bg-[var(--accent)]/8";

            return (
              <div key={category.id} className={`rounded-[24px] border p-4 ${tint}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">{category.name}</p>
                    <p className={`font-outfit mt-3 text-2xl font-extrabold ${remainingAmount < 0 ? "text-[var(--danger)]" : "text-[var(--text-primary)]"}`}>
                      {formatCurrency(Math.abs(remainingAmount))}
                    </p>
                    <p className="font-inter mt-1 text-sm font-medium text-[var(--text-secondary)]">{remainingAmount < 0 ? "OVER" : "LEFT"}</p>
                  </div>
                  <span className={`font-inter text-xs font-bold uppercase tracking-[0.2em] ${remainingAmount < 0 ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}>{percent}%</span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-[var(--warm-line)]">
                  <div
                    className={`h-2 rounded-full transition-[width] duration-300 ${remainingAmount < 0 ? "bg-[var(--danger)]" : "bg-[var(--accent)]"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-outfit text-2xl font-extrabold">Recent Transactions</h2>
            <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">The last 10 entries from your current budget month.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="font-inter text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)] hover:underline"
          >
            View All
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {recentTransactions.map((expense) => {
            const categoryLimit = categoryBudgets.find((c) => c.name === expense.category)?.budgetAmount ?? 0;
            const categorySpent = categoryTotals[expense.category] ?? 0;
            const isOverLimit = categorySpent > categoryLimit && categoryLimit > 0;

            return (
              <button
                key={expense.id}
                type="button"
                onClick={() => setEditingExpenseId(expense.id)}
                className="flex w-full items-center justify-between gap-3 rounded-[24px] border bg-[var(--surface-bg)] p-4 text-left transition-colors hover:border-[var(--accent)]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--card-bg)]">
                    <div className={`h-2 w-2 rounded-full ${isOverLimit ? "bg-[var(--danger)]" : "bg-[var(--accent)]"}`} />
                  </div>
                  <div>
                    <p className="font-inter text-sm font-bold text-[var(--text-primary)]">{expense.description}</p>
                    <p className="font-inter text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {getCategoryDisplayName(expense.category, categoryBudgets)} · {format(parseISO(expense.expenseDate), "MMM d")}
                    </p>
                  </div>
                </div>
                <span className={`font-outfit text-xl font-semibold ${isOverLimit ? "text-[var(--danger)]" : "text-[var(--text-primary)]"}`}>
                  {formatCurrency(expense.amount)}
                </span>
              </button>
            );
          })}
          {!recentTransactions.length && (
            <div className="py-10 text-center">
              <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">No transactions recorded for this month.</p>
            </div>
          )}
        </div>
      </Card>

      <TransactionSearchModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        expenses={monthExpenses}
        categoryBudgets={categoryBudgets}
        showFilters={true}
        onEditExpense={(id) => {
          setEditingExpenseId(id);
          setShowHistory(false);
        }}
      />

      {editingExpense && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--overlay)] p-4" onClick={() => setEditingExpenseId(null)}>
          <Card className="w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-outfit text-2xl font-extrabold">Transaction Detail</h3>
              <button type="button" onClick={() => setEditingExpenseId(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={24} />
              </button>
            </div>
            <p className="font-inter mt-1 text-sm font-medium text-[var(--text-secondary)]">Manage or review this individual expense.</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border bg-[var(--surface-bg)] p-4">
                <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Description</p>
                <p className="font-inter mt-1 text-lg font-bold">{editingExpense.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border bg-[var(--surface-bg)] p-4">
                  <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Amount</p>
                  <p className="font-outfit mt-1 text-2xl font-bold">{formatCurrency(editingExpense.amount)}</p>
                </div>
                <div className="rounded-2xl border bg-[var(--surface-bg)] p-4">
                  <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Category</p>
                  <p className="font-inter mt-1 text-lg font-bold">{editingExpense.category}</p>
                </div>
              </div>
              <div className="rounded-2xl border bg-[var(--surface-bg)] p-4">
                <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Date</p>
                <p className="font-inter mt-1 text-lg font-bold">{format(parseISO(editingExpense.expenseDate), "MMMM d, yyyy")}</p>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <Button className="flex-1" onClick={() => setEditingExpenseId(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      {showLegend ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--overlay)] p-4" onClick={() => setShowLegend(false)}>
          <Card ref={legendRef} role="dialog" aria-modal="true" aria-labelledby="budget-intelligence-title" className="w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 id="budget-intelligence-title" className="font-outfit text-2xl font-extrabold">Budget Intelligence</h3>
              <button type="button" className="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => setShowLegend(false)}>CLOSE</button>
            </div>
            <p className="font-inter mt-2 text-sm font-medium text-[var(--text-secondary)]">{getDailyStatusDescription(dailyStatus)}</p>
            <div className="mt-5 space-y-3">
              {[
                "COMFORTABLE: Daily room is significantly ahead of target.",
                "ON TRACK: Daily room is aligned with the plan.",
                "TIGHT: Spending still fits, but flexibility is limited.",
                "CRITICAL: Remaining budget is running thin.",
                "OVERSPENT: The current pace has gone beyond the month’s safe limit.",
              ].map((entry) => (
                <div key={entry} className="rounded-2xl border bg-[var(--surface-bg)] p-4 font-inter text-sm font-medium text-[var(--text-primary)]">
                  {entry}
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
