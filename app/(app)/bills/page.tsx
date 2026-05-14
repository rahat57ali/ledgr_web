"use client";

import { useMemo, useState } from "react";
import { AlarmClock, Check, CreditCard, Flame, Globe, Home, Trash2, X, Zap } from "lucide-react";
import { billUrgencyLevel } from "@/lib/calculations";
import { useLedgr } from "@/lib/ledgr-provider";
import { Button, Card, EmptyState, Input, PageTitle, Pill } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

const QUICK_BILLS = [
  { name: "Electricity", icon: "zap", Icon: Zap },
  { name: "Gas", icon: "flame", Icon: Flame },
  { name: "Internet", icon: "globe", Icon: Globe },
  { name: "Rent", icon: "home", Icon: Home },
];

export default function BillsPage() {
  const { bills, addBill, deleteBill, payBill } = useLedgr();
  const [form, setForm] = useState({ name: "", amount: "", date: "", icon: "credit-card" });
  const [payingBill, setPayingBill] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const committed = useMemo(() => bills.reduce((sum, bill) => sum + bill.amount, 0), [bills]);

  return (
    <div className="space-y-6">
      <PageTitle title="Bills" subtitle="Recurring bills, urgency tinting, quick-add utilities, and same-day next-month renewals." />

      <Card className="bg-[linear-gradient(135deg,rgba(138,43,226,0.18),transparent_38%),linear-gradient(180deg,var(--card-bg),var(--surface-elevated))]">
        <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Monthly Committed</p>
        <p className="font-outfit mt-3 text-4xl font-extrabold">{formatCurrency(committed)}</p>
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Bill name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <Input type="number" min="0" placeholder="Amount" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
          <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
          <Button
            disabled={!form.name || Number(form.amount) <= 0 || !form.date}
            onClick={async () => {
              await addBill({
                name: form.name,
                amount: Number(form.amount),
                nextDueDate: new Date(`${form.date}T12:00:00`).toISOString(),
                icon: form.icon,
              });
              setForm({ name: "", amount: "", date: "", icon: "credit-card" });
            }}
          >
            Add Bill
          </Button>
        </div>
      </Card>

      <Card>
        <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Quick Add</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_BILLS.map((entry) => (
            <button
              key={entry.name}
              type="button"
              onClick={() => setForm((current) => ({ ...current, name: entry.name, icon: entry.icon }))}
              className="flex items-center gap-3 rounded-2xl border bg-[var(--surface-bg)] px-4 py-4 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)]">
                <entry.Icon size={18} />
              </div>
              <span className="font-outfit text-sm font-extrabold">{entry.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {!bills.length ? (
        <EmptyState title="No recurring bills yet" description="Add utility, subscription, or rent reminders here to keep the navigation warning dot meaningful." />
      ) : (
        <div className="space-y-4">
          {bills.map((bill) => {
            const urgency = billUrgencyLevel(bill.nextDueDate);
            const tint = urgency === "overdue" ? "bg-[var(--danger)]/10 border-[var(--danger)]/30" : urgency === "soon" ? "bg-[var(--accent-secondary)]/10 border-[var(--accent-secondary)]/30" : "bg-[var(--card-bg)]";
            return (
              <Card key={bill.id} className={tint}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-bg)]">
                      <CreditCard size={18} className={urgency === "overdue" ? "text-[var(--danger)]" : "text-[var(--accent)]"} />
                    </div>
                    <div>
                      <h3 className="font-outfit text-xl font-extrabold">{bill.name}</h3>
                      <p className="font-inter text-sm font-bold text-[var(--text-secondary)]">{new Date(bill.nextDueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-outfit text-2xl font-semibold">{formatCurrency(bill.amount)}</span>
                    <Pill className={urgency === "overdue" ? "border-transparent bg-[var(--danger)]/15 text-[var(--danger)]" : urgency === "soon" ? "border-transparent bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)]" : ""}>
                      {urgency === "overdue" ? "Overdue" : urgency === "soon" ? "Due Soon" : "Scheduled"}
                    </Pill>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                  {payingBill === bill.id ? (
                    <>
                      <Input className="max-w-[180px]" type="number" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} placeholder={String(bill.amount)} />
                      <Button
                        onClick={async () => {
                          await payBill(bill.id, Number(payAmount || bill.amount));
                          setPayingBill(null);
                          setPayAmount("");
                        }}
                      >
                        Confirm
                      </Button>
                      <Button variant="ghost" onClick={() => setPayingBill(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" onClick={() => { setPayingBill(bill.id); setPayAmount(String(bill.amount)); }}>
                      Paid & Renew
                    </Button>
                  )}

                  {confirmDeleteId === bill.id ? (
                    <div className="flex items-center gap-2">
                      <button type="button" className="rounded-2xl bg-[var(--success)]/15 p-3 text-[var(--success)]" onClick={() => void deleteBill(bill.id)}>
                        <Check size={16} />
                      </button>
                      <button type="button" className="rounded-2xl bg-[var(--danger)]/15 p-3 text-[var(--danger)]" onClick={() => setConfirmDeleteId(null)}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="rounded-2xl p-3 text-[var(--text-muted)]" onClick={() => setConfirmDeleteId(bill.id)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
