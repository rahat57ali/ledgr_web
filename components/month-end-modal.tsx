"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRightCircle, CalendarDays, CheckCircle2, ChevronRight, PencilLine, Trash2 } from "lucide-react";
import { useCurrentMonthExpenseSummary, useLedgr } from "@/lib/ledgr-provider";
import { filterExpensesByMonth, getMonthlyInsights, sumExpenses } from "@/lib/calculations";
import { Button, Card, Input, Pill } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export function MonthEndModal() {
  const router = useRouter();
  const { rolloverRecovery, budgetConfig, categoryBudgets, expenses, resolveMonthEnd, saveRolloverStep } = useLedgr();
  const [rolloverAmount, setRolloverAmount] = useState(0);
  const [updatedBudget, setUpdatedBudget] = useState("");

  const sourceMonth = rolloverRecovery?.sourceMonth;
  const previousBudget = budgetConfig;
  const previousExpenses = useMemo(
    () => (sourceMonth ? filterExpensesByMonth(expenses, sourceMonth) : []),
    [expenses, sourceMonth],
  );
  const previousSpent = sumExpenses(previousExpenses);
  const previousTotal = rolloverRecovery?.previousBudgetTotal ?? previousBudget?.totalBudget ?? 0;
  const remaining = previousTotal - previousSpent;
  const insights = useMemo(
    () =>
      sourceMonth
        ? getMonthlyInsights(
            expenses,
            sourceMonth,
            previousTotal,
            Object.fromEntries(categoryBudgets.map((category) => [category.name, category.budgetAmount])),
          )
        : [],
    [categoryBudgets, expenses, previousTotal, sourceMonth],
  );

  if (!rolloverRecovery || !sourceMonth) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--overlay)] p-4">
      <Card className="w-full max-w-4xl bg-[var(--surface-elevated)] p-0">
        <div className="border-b px-6 py-5">
          <Pill className="border-transparent bg-[var(--accent)] text-black">Month End Wizard</Pill>
          <h2 className="font-outfit mt-3 text-3xl font-extrabold">Complete {sourceMonth}</h2>
          <p className="font-inter mt-2 text-sm font-medium text-[var(--text-secondary)]">
            This flow is required before Ledgr unlocks the new month.
          </p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            {rolloverRecovery.step === 1 ? (
              <>
                <Card className="bg-transparent shadow-none">
                  <div className="flex flex-wrap items-center gap-3">
                    <Pill>{remaining >= 0 ? "Surplus" : "Deficit"}</Pill>
                    {remaining < 0 ? (
                      <Pill className="border-transparent bg-[var(--danger)]/15 text-[var(--danger)]">Overspent</Pill>
                    ) : null}
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Budget</p>
                      <p className="font-outfit mt-2 text-2xl font-semibold">{formatCurrency(previousTotal)}</p>
                    </div>
                    <div>
                      <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Spent</p>
                      <p className="font-outfit mt-2 text-2xl font-semibold">{formatCurrency(previousSpent)}</p>
                    </div>
                    <div>
                      <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">{remaining >= 0 ? "Remaining" : "Deficit"}</p>
                      <p className={`font-outfit mt-2 text-2xl font-semibold ${remaining >= 0 ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                        {formatCurrency(Math.abs(remaining))}
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="grid gap-3 md:grid-cols-2">
                  {insights.map((insight) => (
                    <Card key={insight.id} className="relative overflow-hidden bg-[var(--card-bg)]">
                      <div className="absolute inset-y-0 left-0 w-1 bg-[var(--accent)]" />
                      <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">{insight.title}</p>
                      <p className="font-outfit mt-3 text-xl font-extrabold">{insight.value}</p>
                      <p className="font-inter mt-2 text-sm font-medium leading-6 text-[var(--text-secondary)]">{insight.subtext}</p>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Button
                    className="gap-2"
                    disabled={remaining <= 0}
                    onClick={async () => {
                      setRolloverAmount(remaining);
                      await saveRolloverStep(2, remaining);
                    }}
                  >
                    <ArrowRightCircle size={18} />
                    Roll Over
                  </Button>
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={async () => {
                      setRolloverAmount(0);
                      await saveRolloverStep(2, 0);
                    }}
                  >
                    <Trash2 size={18} />
                    Discard
                  </Button>
                </div>
              </>
            ) : null}

            {rolloverRecovery.step === 2 ? (
              <div className="space-y-4">
                {remaining < 0 ? (
                  <Card className="border-[var(--danger)]/30 bg-[var(--danger)]/10">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-1 text-[var(--danger)]" size={18} />
                      <p className="font-inter text-sm font-bold text-[var(--danger)]">
                        You overspent last month by {formatCurrency(Math.abs(remaining))}.
                      </p>
                    </div>
                  </Card>
                ) : null}
                <Card className="space-y-4 bg-[var(--card-bg)]">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={18} className="text-[var(--accent)]" />
                    <div>
                      <h3 className="font-outfit text-2xl font-extrabold">Set up the new month</h3>
                      <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">Keep the same base budget or switch to an updated one.</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Button
                      className="gap-2"
                      onClick={() => void resolveMonthEnd({ rolloverAmount: rolloverRecovery.rolloverAmount, keepSame: true })}
                    >
                      <CheckCircle2 size={18} />
                      Keep Same
                    </Button>
                    <Button
                      variant="secondary"
                      className="gap-2"
                      onClick={() => void saveRolloverStep(3, rolloverRecovery.rolloverAmount)}
                    >
                      <PencilLine size={18} />
                      Update Budget
                    </Button>
                  </div>
                </Card>
              </div>
            ) : null}

            {rolloverRecovery.step === 3 ? (
              <Card className="space-y-4 bg-[var(--card-bg)]">
                <div className="flex items-center gap-3">
                  <ChevronRight size={18} className="text-[var(--accent)]" />
                  <div>
                    <h3 className="font-outfit text-2xl font-extrabold">Update total budget</h3>
                    <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">Enter a new base amount, then Ledgr will carry you into Settings for category allocation.</p>
                  </div>
                </div>
                <Input
                  type="number"
                  min="0"
                  value={updatedBudget}
                  onChange={(event) => setUpdatedBudget(event.target.value)}
                  placeholder={String(previousTotal)}
                />
                <Button
                  onClick={async () => {
                    await resolveMonthEnd({
                      rolloverAmount: rolloverRecovery.rolloverAmount,
                      keepSame: false,
                      updatedBudgetTotal: Number(updatedBudget || previousTotal),
                    });
                    router.push("/settings");
                  }}
                >
                  Confirm New Budget
                </Button>
              </Card>
            ) : null}
          </div>

          <Card className="space-y-4 bg-[var(--card-bg)]">
            <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Progress</p>
            <div className="space-y-3">
              {[
                { label: "Month Summary", active: rolloverRecovery.step >= 1 },
                { label: "Budget Choice", active: rolloverRecovery.step >= 2 },
                { label: "Update Budget", active: rolloverRecovery.step >= 3 },
              ].map((entry, index) => (
                <div key={entry.label} className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${entry.active ? "bg-[var(--accent)] text-black" : "border text-[var(--text-muted)]"}`}>
                    <span className="font-outfit text-sm font-extrabold">{index + 1}</span>
                  </div>
                  <span className="font-inter text-sm font-bold text-[var(--text-primary)]">{entry.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
}
