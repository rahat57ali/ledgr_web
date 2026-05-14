"use client";

import { useMemo, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLedgr } from "@/lib/ledgr-provider";
import { filterExpensesByMonth, getCategoryTotals, sumExpenses } from "@/lib/calculations";
import { getCategoryDisplayName } from "@/lib/category-label";
import { Card, EmptyState, PageTitle, Pill } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

const PIE_COLORS = ["#00F0FF", "#8A2BE2", "#10B981", "#EF4444", "#00F0FF", "#8A2BE2", "#10B981"];

export default function InsightsPage() {
  const { expenses, categoryBudgets } = useLedgr();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const monthKey = format(selectedDate, "yyyy-MM");
  const monthLabel = format(selectedDate, "MMMM yyyy");
  const monthExpenses = useMemo(() => filterExpensesByMonth(expenses, monthKey), [expenses, monthKey]);
  const totalSpent = sumExpenses(monthExpenses);
  const categoryTotals = Object.entries(getCategoryTotals(monthExpenses))
    .map(([category, amount]) => ({ category, amount, percentage: totalSpent ? Math.round((amount / totalSpent) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const chartData = Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const amount = monthExpenses
      .filter((expense) => new Date(expense.expenseDate).getDate() === day)
      .reduce((sum, expense) => sum + expense.amount, 0);
    return { day, amount };
  });

  return (
    <div className="space-y-6">
      <PageTitle
        title="Insights"
        subtitle="Month-by-month analytics, category drilldowns, and historical visibility across the full expense archive."
        action={
          <div className="flex items-center gap-3 rounded-2xl border bg-[var(--surface-bg)] px-3 py-2">
            <button type="button" onClick={() => setSelectedDate(subMonths(selectedDate, 1))} className="font-outfit px-2 text-sm font-extrabold">
              Prev
            </button>
            <span className="font-outfit min-w-36 text-center text-sm font-extrabold">{monthLabel}</span>
            <button type="button" onClick={() => setSelectedDate(addMonths(selectedDate, 1))} className="font-outfit px-2 text-sm font-extrabold">
              Next
            </button>
          </div>
        }
      />

      {!monthExpenses.length ? (
        <EmptyState title={`No data for ${monthLabel}`} description="Pick another month or start logging more expenses to unlock the full insights view." />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Total Spending</p>
              <p className="font-outfit mt-3 text-4xl font-extrabold">{formatCurrency(totalSpent)}</p>
              <div className="mt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryTotals} dataKey="amount" nameKey="category" innerRadius={70} outerRadius={110}>
                      {categoryTotals.map((entry, index) => (
                        <Cell key={entry.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-outfit text-2xl font-extrabold">Daily Spending</h2>
                  <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">Full monthly rhythm, not just category totals.</p>
                </div>
                <Pill>{monthExpenses.length} expenses</Pill>
              </div>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="day" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                    <Bar dataKey="amount" fill="#00F0FF" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="font-outfit text-2xl font-extrabold">Category Breakdown</h2>
            <div className="mt-5 space-y-3">
              {categoryTotals.map((entry) => (
                <div key={entry.category} className="rounded-[24px] border bg-[var(--surface-bg)] p-4">
                  <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setExpandedCategory(expandedCategory === entry.category ? null : entry.category)}>
                    <div>
                        <p className="font-outfit text-lg font-extrabold">{getCategoryDisplayName(entry.category, categoryBudgets)}</p>
                      <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">{entry.percentage}% of the selected month</p>
                    </div>
                    <div className="text-right">
                      <p className="font-outfit text-xl font-semibold">{formatCurrency(entry.amount)}</p>
                      <p className="font-inter text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Drill Down</p>
                    </div>
                  </button>
                  {expandedCategory === entry.category ? (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      {monthExpenses
                        .filter((expense) => expense.category === entry.category)
                        .map((expense) => (
                          <div key={expense.id} className="flex items-center justify-between rounded-2xl border bg-[var(--card-bg)] px-4 py-3">
                            <div>
                              <p className="font-inter text-sm font-bold text-[var(--text-primary)]">{expense.description}</p>
                              <p className="font-inter text-xs font-medium text-[var(--text-secondary)]">
                                {getCategoryDisplayName(expense.category, categoryBudgets)} · {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                              </p>
                            </div>
                            <span className="font-outfit text-lg font-semibold">{formatCurrency(expense.amount)}</span>
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
