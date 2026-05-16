"use client";

import { useEffect, useMemo, useState } from "react";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLedgr } from "@/lib/ledgr-provider";
import { filterExpensesByMonth, getCategoryTotals, getDynamicTips, getHighestSpendingDays, getPaceAndProjection, getRepeatPurchases, getSpendTypeBreakdown, getTopSpendingItems, getWeekOverWeek, sumExpenses } from "@/lib/calculations";
import { getCategoryDisplayName } from "@/lib/category-label";
import { Card, EmptyState, Pill } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";

const PIE_COLORS = ["#00F0FF", "#8A2BE2", "#10B981", "#EF4444", "#00F0FF", "#8A2BE2", "#10B981"];

export default function InsightsPage() {
  const { expenses, categoryBudgets, budgetConfig, refreshExpenses } = useLedgr();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const monthKey = format(selectedDate, "yyyy-MM");

  useEffect(() => {
    void refreshExpenses(monthKey);
  }, [monthKey, refreshExpenses]);
  const monthLabel = format(selectedDate, "MMMM yyyy");
  const monthExpenses = useMemo(() => filterExpensesByMonth(expenses, monthKey), [expenses, monthKey]);
  const totalSpent = useMemo(() => sumExpenses(monthExpenses), [monthExpenses]);
  const categoryTotals = useMemo(() => Object.entries(getCategoryTotals(monthExpenses))
    .map(([category, amount]) => ({ category, amount, percentage: totalSpent ? Math.round((amount / totalSpent) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount), [monthExpenses, totalSpent]);
  const chartData = useMemo(() => Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const amount = monthExpenses
      .filter((expense) => parseISO(expense.expenseDate).getDate() === day)
      .reduce((sum, expense) => sum + expense.amount, 0);
    return { day, amount };
  }), [monthExpenses]);

  return (
    <div className="space-y-6">
      {!monthExpenses.length ? (
        <EmptyState title={`No data for ${monthLabel}`} description="Pick another month or start logging more expenses to unlock the full insights view." />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Total Spending</p>
                <div className="flex items-center gap-3 rounded-full border bg-[var(--surface-bg)] px-3 py-1.5 self-start sm:self-auto">
                  <button type="button" onClick={() => setSelectedDate(subMonths(selectedDate, 1))} className="font-outfit px-2 text-sm font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    Prev
                  </button>
                  <span className="font-outfit min-w-[120px] text-center text-sm font-extrabold">{monthLabel}</span>
                  <button type="button" onClick={() => setSelectedDate(addMonths(selectedDate, 1))} className="font-outfit px-2 text-sm font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    Next
                  </button>
                </div>
              </div>
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

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="font-outfit text-2xl font-extrabold">Top Spending Items</h2>
              <div className="mt-5 space-y-3">
                {getTopSpendingItems(monthExpenses).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border bg-[var(--surface-bg)] p-4">
                    <div>
                      <p className="font-inter text-sm font-bold text-[var(--text-primary)]">{item.description}</p>
                      <p className="font-inter text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">{item.category}</p>
                    </div>
                    <span className="font-outfit text-lg font-semibold">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="font-outfit text-2xl font-extrabold">Repeat Purchases</h2>
              <div className="mt-5 space-y-3">
                {getRepeatPurchases(monthExpenses).length > 0 ? (
                  getRepeatPurchases(monthExpenses).map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-2xl border bg-[var(--surface-bg)] p-4">
                      <p className="font-inter text-sm font-bold text-[var(--text-primary)] capitalize">{item.name}</p>
                      <Pill className="border-transparent bg-[var(--accent)]/15 text-[var(--accent)]">{item.count} times</Pill>
                    </div>
                  ))
                ) : (
                  <p className="font-inter text-sm font-medium text-[var(--text-secondary)] py-4 text-center">No repeating patterns found this month.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-[var(--accent)]" />
                <h2 className="font-outfit text-2xl font-extrabold">Pace & Projection</h2>
              </div>
              {mounted ? (() => {
                const { projection, isOverBudget, percentOfBudget, dailyAverage } = getPaceAndProjection(monthExpenses, budgetConfig?.totalBudget ?? 0, monthKey);
                return (
                  <div className="mt-5">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Projected Total</p>
                        <p className={`font-outfit mt-2 text-3xl font-extrabold ${isOverBudget ? "text-[var(--danger)]" : "text-[var(--text-primary)]"}`}>{formatCurrency(projection)}</p>
                      </div>
                      <Pill className={isOverBudget ? "bg-[var(--danger)]/15 text-[var(--danger)] border-transparent" : "bg-[var(--accent)]/15 text-[var(--accent)] border-transparent"}>
                        {Math.round(percentOfBudget)}% of budget
                      </Pill>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-[var(--warm-line)]">
                      <div className={`h-2 rounded-full transition-[width] duration-300 ${isOverBudget ? "bg-[var(--danger)]" : "bg-[var(--accent)]"}`} style={{ width: `${Math.min(100, percentOfBudget)}%` }} />
                    </div>
                    <p className="font-inter mt-4 text-sm font-medium text-[var(--text-secondary)]">Daily Average: {formatCurrency(dailyAverage)}</p>
                  </div>
                );
              })() : <div className="h-40 animate-pulse rounded-2xl bg-[var(--surface-bg)]" />}
            </Card>

            <Card>
              <h2 className="font-outfit text-2xl font-extrabold">Spend Type</h2>
              <div className="mt-5 space-y-4">
                {(() => {
                  const { essential, "non-essential": nonEssential } = getSpendTypeBreakdown(monthExpenses);
                  const total = essential + nonEssential;
                  const ePercent = total ? Math.round((essential / total) * 100) : 0;
                  const nePercent = total ? 100 - ePercent : 0;
                  return (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between font-inter text-xs font-bold uppercase tracking-[0.24em]">
                          <span className="text-[var(--text-primary)]">Essential</span>
                          <span className="text-[var(--accent)]">{formatCurrency(essential)} ({ePercent}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--warm-line)] overflow-hidden">
                          <div className="h-full bg-[var(--accent)]" style={{ width: `${ePercent}%` }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between font-inter text-xs font-bold uppercase tracking-[0.24em]">
                          <span className="text-[var(--text-primary)]">Non-Essential</span>
                          <span className="text-[var(--warning)]">{formatCurrency(nonEssential)} ({nePercent}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--warm-line)] overflow-hidden">
                          <div className="h-full bg-[var(--warning)]" style={{ width: `${nePercent}%` }} />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="font-outfit text-2xl font-extrabold">Highest Spending Days</h2>
              <div className="mt-5 space-y-3">
                {getHighestSpendingDays(monthExpenses).map((day) => (
                  <div key={day.date} className="flex items-center justify-between rounded-2xl border bg-[var(--surface-bg)] p-4">
                    <p className="font-inter text-sm font-bold text-[var(--text-primary)]">{format(parseISO(day.date), "MMMM d")}</p>
                    <span className="font-outfit text-lg font-semibold">{formatCurrency(day.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="font-outfit text-2xl font-extrabold">Week-over-Week</h2>
              <div className="mt-5 space-y-3">
                {mounted ? getWeekOverWeek(monthExpenses, monthKey).map((week) => (
                  <div key={week.week} className="flex items-center justify-between rounded-2xl border bg-[var(--surface-bg)] p-4">
                    <div>
                      <p className="font-inter text-sm font-bold text-[var(--text-primary)]">Week {week.week}</p>
                      <p className="font-inter text-xs font-medium text-[var(--text-secondary)]">{formatCurrency(week.total)}</p>
                    </div>
                    {week.week > 1 && (
                      <div className={`flex items-center gap-1 font-inter text-sm font-bold ${week.diff > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                        {week.diff > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {Math.abs(Math.round(week.percent))}%
                      </div>
                    )}
                  </div>
                )) : <div className="h-40 animate-pulse rounded-2xl bg-[var(--surface-bg)]" />}
              </div>
            </Card>
          </div>

          <Card className="border-t-4 border-t-[var(--accent)]">
            <div className="flex items-center gap-2">
              <Sparkles className="text-[var(--accent)]" size={24} />
              <h2 className="font-outfit text-2xl font-extrabold">Insights & Tips</h2>
            </div>
            <div className="mt-5 space-y-3">
              {mounted ? getDynamicTips(monthExpenses, monthKey, budgetConfig?.totalBudget ?? 0, Object.fromEntries(categoryBudgets.map(c => [c.name, c.budgetAmount]))).map((tip, idx) => (
                <div key={idx} className="flex gap-4 rounded-2xl border bg-[var(--surface-bg)] p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
                    {tip.includes("Excellent") ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <p className="font-inter text-sm font-medium leading-relaxed text-[var(--text-primary)]">{tip}</p>
                </div>
              )) : <div className="h-40 animate-pulse rounded-2xl bg-[var(--surface-bg)]" />}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
