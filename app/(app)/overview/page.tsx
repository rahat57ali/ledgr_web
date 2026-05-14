"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { useCurrentMonthExpenseSummary, useLedgr } from "@/lib/ledgr-provider";
import { getDailyAllowance, getDailyStatus, getDailyStatusDescription } from "@/lib/calculations";
import { Card, PageTitle, Pill } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export default function OverviewPage() {
  const { budgetConfig, categoryBudgets } = useLedgr();
  const { monthExpenses, totalSpent, categoryTotals } = useCurrentMonthExpenseSummary();
  const [showLegend, setShowLegend] = useState(false);
  const remaining = (budgetConfig?.totalBudget ?? 0) - totalSpent;
  const dailyAllowance = useMemo(() => getDailyAllowance(budgetConfig?.totalBudget ?? 0, totalSpent), [budgetConfig?.totalBudget, totalSpent]);
  const dailyStatus = getDailyStatus(budgetConfig?.totalBudget ?? 0, totalSpent);

  return (
    <div className="space-y-6">
      <PageTitle title="Overview" subtitle="Current-month budget health, category pressure, and a quick budget intelligence read." />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Budget", value: formatCurrency(budgetConfig?.totalBudget ?? 0) },
          { label: "Total Spent", value: formatCurrency(totalSpent) },
          { label: "Remaining", value: formatCurrency(remaining) },
        ].map((item) => (
          <Card key={item.label}>
            <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">{item.label}</p>
            <p className="font-outfit mt-3 text-3xl font-extrabold">{item.value}</p>
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
                    ? "bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)]"
                    : "bg-[var(--danger)]/15 text-[var(--danger)]"
            }`}
          >
            <Info size={16} />
            {dailyStatus}
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-outfit text-2xl font-extrabold">Category Remaining</h2>
            <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">All calculations are scoped to the active budget month only.</p>
          </div>
          <Pill>{monthExpenses.length} transactions</Pill>
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
                  ? "bg-[var(--accent-secondary)]/10"
                  : "bg-[var(--accent)]/8";

            return (
              <div key={category.id} className={`rounded-[24px] border p-4 ${tint}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">{category.name}</p>
                    <p className={`font-outfit mt-3 text-2xl font-extrabold ${remainingAmount < 0 ? "text-[var(--danger)]" : "text-[var(--text-primary)]"}`}>
                      {formatCurrency(Math.abs(remainingAmount))}
                    </p>
                    <p className="font-inter mt-1 text-sm font-medium text-[var(--text-secondary)]">{remainingAmount < 0 ? "Over budget" : "left"}</p>
                  </div>
                  <span className={`font-inter text-xs font-bold uppercase tracking-[0.2em] ${remainingAmount < 0 ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}>{percent}%</span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-[var(--warm-line)]">
                  <div
                    className={`h-2 rounded-full ${remainingAmount < 0 ? "bg-[var(--danger)]" : "bg-[var(--accent)]"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {showLegend ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--overlay)] p-4" onClick={() => setShowLegend(false)}>
          <Card className="w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="font-outfit text-2xl font-extrabold">Budget Intelligence</h3>
            <p className="font-inter mt-2 text-sm font-medium text-[var(--text-secondary)]">{getDailyStatusDescription(dailyStatus)}</p>
            <div className="mt-5 space-y-3">
              {[
                "Comfortable: Daily room is significantly ahead of target.",
                "On Track: Daily room is aligned with the plan.",
                "Tight: Spending still fits, but flexibility is limited.",
                "Critical: Remaining budget is running thin.",
                "Overspent: The current pace has gone beyond the month’s safe limit.",
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
