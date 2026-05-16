"use client";

import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { useLedgr } from "@/lib/ledgr-provider";
import { getCategoryDisplayName } from "@/lib/category-label";
import { getCategoryIcon } from "@/lib/presentation";
import { Card, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export default function DaysPage() {
  const { expenses, categoryBudgets } = useLedgr();
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const selectedMonth = format(selectedMonthDate, "yyyy-MM");
  const monthStart = startOfMonth(selectedMonthDate);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) });
  const selectedExpenses = expenses.filter((expense) => format(parseISO(expense.expenseDate), "yyyy-MM-dd") === selectedDate);
  const totalSelected = selectedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const calendarRows = useMemo(() => {
    const startWeekday = monthStart.getDay();
    const cells = Array.from({ length: startWeekday }, () => null as Date | null).concat(days);
    while (cells.length % 7 !== 0) cells.push(null);
    return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  }, [days, monthStart]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Calendar</p>
            <div className="flex items-center gap-3 rounded-full border bg-[var(--surface-bg)] px-3 py-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  const next = subMonths(selectedMonthDate, 1);
                  setSelectedMonthDate(next);
                  setSelectedDate(format(startOfMonth(next), "yyyy-MM-dd"));
                }}
                className="font-outfit px-2 text-sm font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Prev
              </button>
              <span className="font-outfit min-w-[120px] text-center text-sm font-extrabold">{format(selectedMonthDate, "MMMM yyyy")}</span>
              <button
                type="button"
                onClick={() => {
                  const next = addMonths(selectedMonthDate, 1);
                  setSelectedMonthDate(next);
                  setSelectedDate(format(startOfMonth(next), "yyyy-MM-dd"));
                }}
                className="font-outfit px-2 text-sm font-extrabold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((entry) => (
              <div key={entry} className="pb-2 text-center font-inter text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {entry}
              </div>
            ))}
            {calendarRows.flat().map((day, index) => {
              if (!day) return <div key={`blank-${index}`} className="aspect-square rounded-2xl border border-transparent" />;
              const key = format(day, "yyyy-MM-dd");
              const count = expenses.filter((expense) => format(parseISO(expense.expenseDate), "yyyy-MM-dd") === key).length;
              const selected = key === selectedDate;
              const isVisibleMonth = format(day, "yyyy-MM") === selectedMonth;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`aspect-square rounded-2xl border p-2 text-left ${selected ? "border-transparent bg-[var(--accent)] text-black" : "bg-[var(--surface-bg)]"} ${!isVisibleMonth ? "opacity-50" : ""}`}
                >
                  <div className="flex h-full flex-col justify-between">
                    <span className="font-outfit text-lg font-extrabold">{format(day, "d")}</span>
                    {count ? <span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-black" : "bg-[var(--accent)]"}`} /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="font-outfit text-2xl font-extrabold">{format(new Date(`${selectedDate}T12:00:00`), "MMMM d, yyyy")}</h2>
          <p className="font-inter mt-2 text-sm font-medium text-[var(--text-secondary)]">
            {selectedExpenses.length} expense{selectedExpenses.length === 1 ? "" : "s"} · {formatCurrency(totalSelected)}
          </p>

          <div className="mt-5 space-y-3">
            {!selectedExpenses.length ? (
              <EmptyState title="No expenses on this day" description="Pick another date or start tracking to make the calendar more useful." />
            ) : (
              selectedExpenses.map((expense) => {
                const Icon = getCategoryIcon(expense.category);
                return (
                  <div key={expense.id} className="rounded-2xl border bg-[var(--surface-bg)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--card-bg)]">
                          <Icon size={16} className="text-[var(--accent)]" />
                        </div>
                        <div>
                          <p className="font-inter text-sm font-bold text-[var(--text-primary)]">{expense.description}</p>
                          <p className="font-inter text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            {getCategoryDisplayName(expense.category, categoryBudgets)}
                          </p>
                        </div>
                      </div>
                      <span className="font-outfit text-xl font-semibold">{formatCurrency(expense.amount)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
