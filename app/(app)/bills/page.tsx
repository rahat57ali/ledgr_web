"use client";

import { useMemo, useState } from "react";
import { Check, Trash2, X, Zap, Flame, Globe, Home } from "lucide-react";
import { useLedgr } from "@/lib/ledgr-provider";
import { getBillIcon, getBillUrgencyMeta } from "@/lib/presentation";
import { Button, Card, EmptyState, Input, Pill, Select } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

const QUICK_BILLS = [
  { name: "Electricity", icon: "zap", Icon: Zap },
  { name: "Gas", icon: "flame", Icon: Flame },
  { name: "Internet", icon: "globe", Icon: Globe },
  { name: "Rent", icon: "home", Icon: Home },
];

export default function BillsPage() {
  const { bills, addBill, deleteBill, payBill } = useLedgr();
  const [form, setForm] = useState({ name: "", amount: "", date: "", icon: "credit-card", category: "Bills" });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payingBill, setPayingBill] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const committed = useMemo(() => bills.reduce((sum, bill) => sum + bill.amount, 0), [bills]);

  return (
    <div className="space-y-6">


      <Card>
        <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Monthly Committed</p>
        <p className="font-outfit mt-3 text-4xl font-extrabold">{formatCurrency(committed)}</p>
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-5">
          <label className="font-inter text-sm font-bold text-[var(--text-secondary)]">
            Name
            <Input aria-invalid={Boolean(formError)} aria-describedby={formError ? "bill-form-error" : undefined} placeholder="Bill name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="font-inter text-sm font-bold text-[var(--text-secondary)]">
            Amount
            <Input aria-invalid={Boolean(formError)} aria-describedby={formError ? "bill-form-error" : undefined} type="number" min="0" placeholder="Amount" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
          </label>
          <label className="font-inter text-sm font-bold text-[var(--text-secondary)]">
            Due Date
            <Input aria-invalid={Boolean(formError)} aria-describedby={formError ? "bill-form-error" : undefined} type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
          </label>
          <label className="font-inter text-sm font-bold text-[var(--text-secondary)]">
            Category
            <Select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
            {["Bills", "Shopping", "Other"].map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
            </Select>
          </label>
          <Button
            disabled={submitting || !form.name.trim() || Number(form.amount) <= 0 || !form.date}
            onClick={async () => {
              if (!form.name.trim() || Number(form.amount) <= 0 || !form.date) {
                setFormError("Name, amount, and due date are required.");
                return;
              }
              setSubmitting(true);
              setFormError(null);
              await addBill({
                name: form.name.trim(),
                amount: Number(form.amount),
                nextDueDate: new Date(`${form.date}T12:00:00`).toISOString(),
                icon: form.icon,
                category: form.category,
              });
              setForm({ name: "", amount: "", date: "", icon: "credit-card", category: "Bills" });
              setSubmitting(false);
            }}
          >
            {submitting ? "Saving..." : "Add Bill"}
          </Button>
        </div>
        {formError ? <p id="bill-form-error" className="mt-3 font-inter text-sm font-bold text-[var(--danger)]">{formError}</p> : null}
      </Card>

      <Card>
        <p className="font-inter text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Quick Add</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_BILLS.map((entry) => (
            <button
              key={entry.name}
              type="button"
              onClick={() => setForm((current) => ({ ...current, name: entry.name, icon: entry.icon, category: "Bills" }))}
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
            const urgency = getBillUrgencyMeta(bill.nextDueDate);
            const BillIcon = getBillIcon(bill.icon, bill.name);
            return (
              <Card key={bill.id} className={urgency.cardClass}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-bg)]">
                      <BillIcon size={18} className={urgency.level === "normal" ? "text-[var(--accent)]" : urgency.textClass} />
                    </div>
                    <div>
                      <h3 className="font-outfit text-xl font-extrabold">{bill.name}</h3>
                      <p className={`font-inter text-sm font-bold ${urgency.textClass}`}>{urgency.label}</p>
                      <p className="font-inter text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">{new Date(bill.nextDueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-outfit text-2xl font-semibold">{formatCurrency(bill.amount)}</span>
                    <Pill className={urgency.pillClass}>{bill.category}</Pill>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                  {payingBill === bill.id ? (
                    <>
                      <Input className="max-w-[180px]" type="number" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} placeholder={String(bill.amount)} />
                      <Button
                        disabled={paying}
                        onClick={async () => {
                          setPaying(true);
                          await payBill(bill.id, Number(payAmount || bill.amount));
                          setPayingBill(null);
                          setPayAmount("");
                          setPaying(false);
                        }}
                      >
                        {paying ? "Saving..." : "Confirm"}
                      </Button>
                      <Button variant="ghost" onClick={() => setPayingBill(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setPayingBill(bill.id);
                        setPayAmount(String(bill.amount));
                      }}
                    >
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
