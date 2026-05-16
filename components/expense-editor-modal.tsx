"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Expense } from "@/lib/types";
import { Button, Card, Input, Select } from "@/components/ui";
import { useFocusTrap } from "@/lib/use-focus-trap";

export function ExpenseEditorModal({
  expense,
  categories,
  onClose,
  onSave,
  onDelete,
}: {
  expense: Expense | null;
  categories: string[];
  onClose: () => void;
  onSave: (payload: {
    description: string;
    amount: number;
    category: string;
    expenseDate: string;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useFocusTrap(dialogRef, Boolean(expense));

  useEffect(() => {
    if (!expense) return;
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setExpenseDate(new Date(expense.expenseDate).toISOString().slice(0, 10));
    setConfirmDelete(false);
  }, [expense]);

  if (!expense) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[var(--overlay)] p-4">
      <Card ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="expense-editor-title" className="w-full max-w-xl bg-[var(--surface-elevated)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 id="expense-editor-title" className="font-outfit text-2xl font-extrabold">Edit Expense</h3>
            <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">Adjust the transaction or remove it entirely.</p>
          </div>
          <button type="button" className="rounded-2xl p-2 text-[var(--text-muted)]" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <label className="font-inter text-sm font-bold text-[var(--text-secondary)]">
            Description
            <Input aria-label="Expense description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
          </label>
          <label className="font-inter text-sm font-bold text-[var(--text-secondary)]">
            Amount
            <Input aria-label="Expense amount" type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" />
          </label>
          <label className="font-inter text-sm font-bold text-[var(--text-secondary)]">
            Date
            <Input aria-label="Expense date" type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
          </label>
          <label className="font-inter text-sm font-bold text-[var(--text-secondary)]">
            Category
            <Select aria-label="Expense category" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
            </Select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <button type="button" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--success)]/15 text-[var(--success)]" onClick={() => void onDelete()}>
                  <Check size={16} />
                </button>
                <button type="button" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--danger)]/15 text-[var(--danger)]" onClick={() => setConfirmDelete(false)}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <Button variant="ghost" className="text-[var(--danger)]" onClick={() => setConfirmDelete(true)}>
                Delete Expense
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              disabled={!description.trim() || Number(amount) <= 0}
              onClick={() =>
                void onSave({
                  description: description.trim(),
                  amount: Number(amount),
                  category,
                  expenseDate: new Date(`${expenseDate}T12:00:00`).toISOString(),
                })
              }
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
