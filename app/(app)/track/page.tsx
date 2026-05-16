"use client";

import { useMemo, useState } from "react";
import { format, parseISO, subMonths } from "date-fns";
import { Pencil, Plus, Search, Sparkles } from "lucide-react";
import { useCurrentMonthExpenseSummary, useLedgr } from "@/lib/ledgr-provider";
import { getDaysRemainingInMonth } from "@/lib/date";
import { autoCategorize } from "@/lib/store";
import { Button, Card, EmptyState, Input, Pill } from "@/components/ui";
import { getCategoryDisplayName } from "@/lib/category-label";
import { formatCurrency } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/presentation";
import { ExpenseEditorModal } from "@/components/expense-editor-modal";
import { GroceryListCard, ReadonlyArchivedListCard } from "@/components/grocery-list-card";
import { TransactionSearchModal } from "@/components/transaction-search-modal";

const PROMPTS = [
  "Let's see where the money went.",
  "You showed up. That already counts.",
  "Quick log. Clear mind. Let's go.",
  "Your wallet called. It needs you.",
  "Don't let today's expenses become tomorrow's mystery.",
  "A minute now saves stress later.",
  "You're doing better than you think. Keep logging.",
  "New day, fresh start. Let's track it.",
  "Got something to add? Let's do it.",
  "The best time to log was earlier. Second best? Right now.",
];

export default function TrackPage() {
  const {
    budgetConfig,
    categoryBudgets,
    expenses,
    groceryLists,
    addExpense,
    updateExpense,
    deleteExpense,
    createGroceryList,
    updateGroceryList,
    deleteGroceryList,
    addGroceryItem,
    updateGroceryItem,
    deleteGroceryItem,
    toggleGroceryItem,
    addGroceryReceipts,
    logGroceryAsExpense,
  } = useLedgr();
  const { monthExpenses, totalSpent } = useCurrentMonthExpenseSummary();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const prompt = PROMPTS[(new Date().getDate() - 1) % PROMPTS.length];
  const todaySpent = useMemo(
    () =>
      expenses
        .filter((expense) => format(parseISO(expense.expenseDate), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"))
        .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );
  const daysLeft = getDaysRemainingInMonth();
  const lastAdded = expenses[0];
  const editingExpense = expenses.find((expense) => expense.id === editingExpenseId) ?? null;
  const activeLists = groceryLists.filter((list) => list.status === "active");
  const archivedLists = groceryLists.filter((list) => list.status === "complete");
  const lastMonthKey = format(subMonths(new Date(), 1), "yyyy-MM");
  const lastMonthSpent = useMemo(
    () =>
      expenses
        .filter((expense) => format(parseISO(expense.expenseDate), "yyyy-MM") === lastMonthKey)
        .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses, lastMonthKey],
  );

  return (
    <div className="space-y-4">
      <Card className="w-full !p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Sparkles size={16} />
              <p className="font-inter text-sm font-bold text-[var(--text-primary)]">{prompt}</p>
            </div>
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 rounded-full border bg-[var(--surface-bg)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
            >
              <Search size={14} /> Search Archive
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center md:text-left">
            <div>
              <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Spent</p>
              <p className="font-outfit text-xl font-semibold text-[var(--accent)]">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Budget</p>
              <p className="font-outfit text-xl font-semibold">{formatCurrency(budgetConfig?.totalBudget ?? 0)}</p>
            </div>
            <div>
              <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Usage</p>
              <p className="font-outfit text-xl font-semibold"><span className="text-[var(--accent)]">{Math.round((totalSpent / Math.max(1, budgetConfig?.totalBudget ?? 1)) * 100)}</span>%</p>
            </div>
            <div>
              <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Today</p>
              <p className="font-outfit text-xl font-semibold text-[var(--accent)]">{formatCurrency(todaySpent)}</p>
            </div>
            <div>
              <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Left</p>
              <p className="font-outfit text-xl font-semibold"><span className="text-[var(--accent)]">{daysLeft}</span>d</p>
            </div>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[var(--warm-line)]">
            <div
              className={`h-1.5 rounded-full transition-[width] duration-300 ${totalSpent > (budgetConfig?.totalBudget ?? 0) ? "bg-[var(--danger)]" : "bg-[var(--accent)]"}`}
              style={{ width: `${Math.min(100, (totalSpent / Math.max(1, budgetConfig?.totalBudget ?? 1)) * 100)}%` }}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Card className="!p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-outfit text-xl font-extrabold">Add Expense</h2>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <label className="font-inter text-xs font-bold text-[var(--text-secondary)]">
                Description
                <div className="mt-1 flex h-10 items-center gap-3 rounded-xl border bg-[var(--surface-bg)] px-3 transition-all focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] outline-none">
                  <Pencil size={14} className="text-[var(--text-muted)]" />
                  <Input aria-invalid={Boolean(formError)} aria-describedby={formError ? "track-form-error" : undefined} className="h-full border-0 bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
                </div>
              </label>
              <label className="font-inter text-xs font-bold text-[var(--text-secondary)]">
                Amount
                <div className="mt-1 flex h-10 items-center gap-3 rounded-xl border bg-[var(--surface-bg)] px-3 transition-all focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] outline-none">
                  <span className="font-inter text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">PKR</span>
                  <Input aria-invalid={Boolean(formError)} aria-describedby={formError ? "track-form-error" : undefined} className="h-full border-0 bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" min="0" placeholder="0" value={amount} onChange={(event) => setAmount(event.target.value)} />
                </div>
              </label>
              <label className="font-inter text-xs font-bold text-[var(--text-secondary)]">
                Date
                <div className="relative mt-1 h-10 w-full overflow-hidden rounded-xl border bg-[var(--surface-bg)] px-3 transition-all focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] hover:border-[var(--border-soft)]">
                  <div className="flex h-full items-center gap-3">
                    <span className="font-inter text-sm font-bold text-[var(--text-secondary)]">
                      {expenseDate === format(new Date(), "yyyy-MM-dd") ? "Today" : `Custom: ${format(parseISO(expenseDate), "d MMM")}`}
                    </span>
                  </div>
                  <Input 
                    aria-invalid={Boolean(formError)} 
                    aria-describedby={formError ? "track-form-error" : undefined} 
                    type="date" 
                    value={expenseDate} 
                    max={format(new Date(), "yyyy-MM-dd")} 
                    onChange={(event) => setExpenseDate(event.target.value)} 
                    className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                  />
                </div>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCategory("")}
                className={`rounded-full border px-3 py-1 text-xs font-bold ${category === "" ? "border-transparent bg-[var(--accent)] text-black" : "border-[var(--border-soft)] bg-[var(--surface-bg)] text-[var(--text-secondary)]"}`}
              >
                Auto Categorize
              </button>
              {categoryBudgets
                .filter((entry) => !entry.isDeleted)
                .map((entry) => {
                  const spent = monthExpenses.filter((expense) => expense.category === entry.name).reduce((sum, expense) => sum + expense.amount, 0);
                  const remaining = entry.budgetAmount - spent;
                  const isOver = remaining < 0;
                  const isSelected = category === entry.name;
                  const Icon = getCategoryIcon(entry.name);
                  
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setCategory(entry.name)}
                      className={`rounded-xl border px-3 py-1.5 text-left transition-colors ${isSelected ? "border-[var(--accent)] bg-[var(--accent)] text-black" : isOver ? "border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)]" : "border-[var(--success)]/50 bg-[var(--success)]/10 text-[var(--success)]"}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon size={12} className={isSelected ? "text-black" : isOver ? "text-[var(--danger)]" : "text-[var(--success)]"} />
                        <span className="font-inter text-[10px] font-extrabold uppercase tracking-wider">{entry.name}</span>
                      </div>
                      <div className={`mt-0.5 font-outfit text-xs font-bold ${isSelected ? "text-black/80" : "text-[var(--text-primary)]"}`}>
                        {formatCurrency(Math.abs(remaining))}
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className="mt-4">
              <Button
                className="h-10 w-full gap-2 text-sm"
                disabled={savingExpense || !description.trim() || Number(amount) <= 0}
                onClick={async () => {
                  if (!description.trim() || Number(amount) <= 0) {
                    setFormError("Description and amount are required.");
                    return;
                  }
                  setSavingExpense(true);
                  setFormError(null);
                  await addExpense({
                    description: description.trim(),
                    amount: Number(amount),
                    category: category || autoCategorize(description),
                    expenseDate: new Date(`${expenseDate}T12:00:00`).toISOString(),
                  });
                  setDescription("");
                  setAmount("");
                  setCategory("");
                  setExpenseDate(format(new Date(), "yyyy-MM-dd"));
                  setSavingExpense(false);
                }}
              >
                <Plus size={16} />
                {savingExpense ? "Saving..." : "Add Expense"}
              </Button>
            </div>
            {formError ? <p id="track-form-error" className="mt-2 font-inter text-xs font-bold text-[var(--danger)]">{formError}</p> : null}

            {lastAdded ? (
              <button
                type="button"
                onClick={() => setEditingExpenseId(lastAdded.id)}
                className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border bg-[var(--surface-bg)] px-3 py-1.5 transition-colors hover:border-[var(--accent)] overflow-hidden"
              >
                <Pill className="shrink-0 border-transparent bg-[var(--surface-bg)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--text-muted)]">LAST ADDED</Pill>
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="shrink-0 font-inter text-xs font-bold text-[var(--accent)]">{getCategoryDisplayName(lastAdded.category, categoryBudgets)}</span>
                  <span className="text-[var(--text-muted)] opacity-50">•</span>
                  <span className="truncate font-inter text-sm font-bold text-[var(--text-secondary)]">{lastAdded.description}</span>
                  <span className="text-[var(--text-muted)] opacity-50">•</span>
                  <span className="shrink-0 font-outfit text-sm font-semibold text-[var(--accent)]">{formatCurrency(lastAdded.amount)}</span>
                </div>
              </button>
            ) : null}
            
            <div className="mt-3 text-center font-inter text-[11px] font-bold text-[var(--text-secondary)]">
              Today: <span className="text-[var(--accent)]">{formatCurrency(todaySpent)}</span> • <span className="text-[var(--accent)]">{daysLeft}</span> days left
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="max-h-[calc(100vh-220px)] overflow-y-auto !p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-outfit text-xl font-extrabold">Grocery Lists</h2>
              </div>
              <div className="flex gap-2">
                <Input className="h-9 w-full sm:w-[180px] text-sm" placeholder="New list title..." value={newListTitle} onChange={(event) => setNewListTitle(event.target.value)} />
                <Button
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  disabled={creatingList || !newListTitle.trim()}
                  onClick={async () => {
                    setCreatingList(true);
                    const newListId = await createGroceryList(newListTitle.trim());
                    if (newListId) setExpandedListId(newListId);
                    setNewListTitle("");
                    setCreatingList(false);
                  }}
                >
                  {creatingList ? "Creating..." : "New List"}
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {!activeLists.length ? (
                <EmptyState title="No grocery lists yet" description="Create a list, add items, attach receipts, and log bought items as categorized expenses." />
              ) : null}

              {activeLists.map((list) => (
                <GroceryListCard
                  key={list.id}
                  list={list}
                  categories={categoryBudgets.filter((entry) => !entry.isDeleted).map((entry) => entry.name)}
                  expanded={expandedListId === list.id}
                  onToggleExpand={() => setExpandedListId(expandedListId === list.id ? null : list.id)}
                  onUpdateList={updateGroceryList}
                  onDeleteList={deleteGroceryList}
                  onAddItem={addGroceryItem}
                  onUpdateItem={updateGroceryItem}
                  onDeleteItem={deleteGroceryItem}
                  onToggleItem={toggleGroceryItem}
                  onAddReceipts={addGroceryReceipts}
                  onLogAsExpense={logGroceryAsExpense}
                />
              ))}

              {archivedLists.length ? (
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-outfit text-lg font-extrabold">Completed Lists</h3>
                  {archivedLists.map((list) => (
                    <ReadonlyArchivedListCard key={list.id} list={list} />
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <ExpenseEditorModal
        expense={editingExpense}
        categories={categoryBudgets.map((entry) => entry.name)}
        onClose={() => setEditingExpenseId(null)}
        onSave={async (payload) => {
          if (!editingExpense) return;
          await updateExpense(editingExpense.id, payload);
          setEditingExpenseId(null);
        }}
        onDelete={async () => {
          if (!editingExpense) return;
          await deleteExpense(editingExpense.id);
          setEditingExpenseId(null);
        }}
      />
      <TransactionSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        expenses={expenses}
        categoryBudgets={categoryBudgets}
        onEditExpense={(id) => {
          setEditingExpenseId(id);
          setShowSearch(false);
        }}
      />
    </div>
  );
}
