"use client";

import { useMemo, useRef, useState } from "react";
import { format, isSameDay, isWithinInterval, parseISO, startOfToday, startOfWeek, startOfMonth, subDays } from "date-fns";
import { Search, X, Calendar as CalendarIcon } from "lucide-react";
import { CategoryBudget, Expense } from "@/lib/types";
import { getCategoryDisplayName } from "@/lib/category-label";
import { Button, Card, Input, Pill } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { useFocusTrap } from "@/lib/use-focus-trap";

type FilterType = "All" | "Today" | "This Week" | "This Month" | "Custom";

interface TransactionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  categoryBudgets: CategoryBudget[];
  onEditExpense: (id: string) => void;
  showFilters?: boolean;
}

export function TransactionSearchModal({
  isOpen,
  onClose,
  expenses,
  categoryBudgets,
  onEditExpense,
  showFilters = false,
}: TransactionSearchModalProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  const filteredExpenses = useMemo(() => {
    let result = expenses;

    // Search filter
    if (query.trim()) {
      const lowQuery = query.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(lowQuery) ||
          e.category.toLowerCase().includes(lowQuery)
      );
    }

    // Date filters
    if (showFilters) {
      const today = startOfToday();
      if (filter === "Today") {
        result = result.filter((e) => isSameDay(parseISO(e.expenseDate), today));
      } else if (filter === "This Week") {
        const weekStart = startOfWeek(today);
        result = result.filter((e) => parseISO(e.expenseDate) >= weekStart);
      } else if (filter === "This Month") {
        const monthStart = startOfMonth(today);
        result = result.filter((e) => parseISO(e.expenseDate) >= monthStart);
      } else if (filter === "Custom") {
        const start = new Date(customRange.start);
        const end = new Date(customRange.end);
        result = result.filter((e) =>
          isWithinInterval(parseISO(e.expenseDate), { start, end })
        );
      }
    }

    return result;
  }, [expenses, query, filter, customRange, showFilters]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--overlay)] p-4" onClick={onClose}>
      <Card
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="flex h-full max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <Input
                autoFocus
                placeholder="Search description or category..."
                className="pl-12"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-[var(--surface-bg)] text-[var(--text-secondary)]"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>

          {showFilters && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["All", "Today", "This Week", "This Month", "Custom"] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded-xl border px-4 py-2 font-inter text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
                      filter === f ? "bg-[var(--accent)] text-black border-transparent" : "bg-[var(--surface-bg)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {filter === "Custom" && (
                <div className="flex items-center gap-3 rounded-2xl border bg-[var(--surface-bg)] p-3">
                  <CalendarIcon size={16} className="text-[var(--text-muted)]" />
                  <input
                    type="date"
                    className="bg-transparent font-inter text-sm font-medium text-[var(--text-primary)] outline-none"
                    value={customRange.start}
                    onChange={(e) => setCustomRange((prev) => ({ ...prev, start: e.target.value }))}
                  />
                  <span className="text-[var(--text-muted)]">—</span>
                  <input
                    type="date"
                    className="bg-transparent font-inter text-sm font-medium text-[var(--text-primary)] outline-none"
                    value={customRange.end}
                    onChange={(e) => setCustomRange((prev) => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-3">
            {filteredExpenses.map((expense) => {
              const categoryLimit = categoryBudgets.find((c) => c.name === expense.category)?.budgetAmount ?? 0;
              // Note: We don't have categoryTotals here, so we'll just show the amount normally or pass it in.
              // Actually, to match exactly, we should probably pass categoryTotals or calculate them.
              // But since this modal is for "History" (possibly across months), "Over Limit" is month-specific.
              // The prompt says "Transactions in the modal are listed with the same row style".
              // I'll assume it means the visual layout.
              return (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() => onEditExpense(expense.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-[24px] border bg-[var(--surface-bg)] p-4 text-left transition-colors hover:border-[var(--accent)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--card-bg)]">
                      <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                    </div>
                    <div>
                      <p className="font-inter text-sm font-bold text-[var(--text-primary)]">{expense.description}</p>
                      <p className="font-inter text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {getCategoryDisplayName(expense.category, categoryBudgets)} · {format(parseISO(expense.expenseDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <span className="font-outfit text-xl font-semibold">{formatCurrency(expense.amount)}</span>
                </button>
              );
            })}
            {!filteredExpenses.length && (
              <div className="py-20 text-center">
                <p className="font-outfit text-xl font-extrabold text-[var(--text-primary)]">No matching transactions</p>
                <p className="font-inter mt-2 text-sm font-medium text-[var(--text-secondary)]">Try a different search term or filter.</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
