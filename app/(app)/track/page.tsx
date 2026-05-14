"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Receipt, Sparkles, Trash2 } from "lucide-react";
import { useCurrentMonthExpenseSummary, useLedgr } from "@/lib/ledgr-provider";
import { getDaysRemainingInMonth } from "@/lib/date";
import { autoCategorize } from "@/lib/store";
import { getCategoryDisplayName } from "@/lib/category-label";
import { Button, Card, EmptyState, Input, PageTitle, Pill, Select } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { ExpenseEditorModal } from "@/components/expense-editor-modal";

const PROMPTS = [
  "Let's see where the money went.",
  "Quick log. Clear mind. Let's go.",
  "Your wallet called. It needs you.",
  "A minute now saves stress later.",
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

  const [mode, setMode] = useState<"expense" | "grocery">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState("");
  const [newListTitle, setNewListTitle] = useState("");
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const prompt = PROMPTS[new Date().getDate() % PROMPTS.length];
  const todaySpent = useMemo(
    () =>
      expenses
        .filter((expense) => format(new Date(expense.expenseDate), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"))
        .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );
  const daysLeft = getDaysRemainingInMonth();
  const lastAdded = expenses[0];
  const editingExpense = expenses.find((expense) => expense.id === editingExpenseId) ?? null;
  const activeLists = groceryLists.filter((list) => list.status === "active");
  const archivedLists = groceryLists.filter((list) => list.status === "complete");

  return (
    <div className="space-y-6">
      <PageTitle
        title="Track"
        subtitle="Log expenses quickly, watch category budgets, and manage grocery runs side by side."
        action={
          <div className="flex rounded-2xl border bg-[var(--surface-bg)] p-1">
            <button
              type="button"
              onClick={() => setMode("expense")}
              className={`rounded-[18px] px-4 py-3 font-outfit text-sm font-extrabold ${mode === "expense" ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)]"}`}
            >
              Track Expense
            </button>
            <button
              type="button"
              onClick={() => setMode("grocery")}
              className={`rounded-[18px] px-4 py-3 font-outfit text-sm font-extrabold ${mode === "grocery" ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)]"}`}
            >
              Grocery Lists
            </button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="bg-[linear-gradient(135deg,rgba(0,240,255,0.08),transparent_36%),linear-gradient(180deg,var(--card-bg),var(--surface-elevated))]">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 text-[var(--accent)]" size={16} />
              <p className="font-inter text-sm font-bold leading-6 text-[var(--text-primary)]">{prompt}</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Spent This Month</p>
                <p className="font-outfit mt-2 text-3xl font-semibold">{formatCurrency(totalSpent)}</p>
              </div>
              <div>
                <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Budget Usage</p>
                <p className="font-outfit mt-2 text-3xl font-semibold">{Math.round((totalSpent / Math.max(1, budgetConfig?.totalBudget ?? 1)) * 100)}%</p>
              </div>
              <div>
                <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Today</p>
                <p className="font-outfit mt-2 text-3xl font-semibold">{formatCurrency(todaySpent)}</p>
              </div>
              <div>
                <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Days Left</p>
                <p className="font-outfit mt-2 text-3xl font-semibold">{daysLeft}</p>
              </div>
            </div>
            <div className="mt-5 h-2 rounded-full bg-[var(--warm-line)]">
              <div
                className={`h-2 rounded-full ${totalSpent > (budgetConfig?.totalBudget ?? 0) ? "bg-[var(--danger)]" : "bg-[var(--accent)]"}`}
                style={{ width: `${Math.min(100, ((totalSpent / Math.max(1, budgetConfig?.totalBudget ?? 1)) * 100))}%` }}
              />
            </div>
          </Card>

          {mode === "expense" ? (
            <Card>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
                <Input type="number" min="0" placeholder="Amount in PKR" value={amount} onChange={(event) => setAmount(event.target.value)} />
                <Input type="date" value={expenseDate} max={format(new Date(), "yyyy-MM-dd")} onChange={(event) => setExpenseDate(event.target.value)} />
                <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">Auto Categorize</option>
                  {categoryBudgets.filter((entry) => !entry.isDeleted).map((entry) => (
                    <option key={entry.id} value={entry.name}>
                      {entry.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 md:grid md:grid-cols-2 xl:grid-cols-3">
                {categoryBudgets
                  .filter((entry) => !entry.isDeleted)
                  .map((entry) => {
                    const spent = monthExpenses.filter((expense) => expense.category === entry.name).reduce((sum, expense) => sum + expense.amount, 0);
                    const remaining = entry.budgetAmount - spent;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setCategory(entry.name)}
                        className={`min-w-[180px] rounded-2xl border px-4 py-3 text-left ${category === entry.name ? "border-transparent bg-[var(--accent)] text-black" : "bg-[var(--surface-bg)]"}`}
                      >
                        <p className="font-inter text-sm font-bold">{entry.name}</p>
                        <p className="font-inter mt-1 text-xs font-bold uppercase tracking-[0.18em]">
                          {remaining >= 0 ? "Remaining" : "Over"} {formatCurrency(Math.abs(remaining))}
                        </p>
                      </button>
                    );
                  })}
              </div>

              <div className="mt-5">
                <Button
                  className="w-full gap-2"
                  disabled={!description || Number(amount) <= 0}
                  onClick={async () => {
                    await addExpense({
                      description,
                      amount: Number(amount),
                      category: category || autoCategorize(description),
                      expenseDate: new Date(`${expenseDate}T12:00:00`).toISOString(),
                    });
                    setDescription("");
                    setAmount("");
                    setCategory("");
                    setExpenseDate(format(new Date(), "yyyy-MM-dd"));
                  }}
                >
                  <Plus size={18} />
                  Add Expense
                </Button>
              </div>

              {lastAdded ? (
                <button
                  type="button"
                  onClick={() => setEditingExpenseId(lastAdded.id)}
                  className="mt-5 w-full rounded-2xl border bg-[var(--surface-bg)] px-4 py-3 text-left"
                >
                  <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Last Added</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Pill className="border-transparent bg-[var(--accent)]/15 text-[var(--accent)]">
                      {getCategoryDisplayName(lastAdded.category, categoryBudgets)}
                    </Pill>
                    <span className="font-inter text-sm font-medium text-[var(--text-secondary)]">{lastAdded.description}</span>
                    <span className="font-outfit text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(lastAdded.amount)}</span>
                  </div>
                </button>
              ) : null}
            </Card>
          ) : null}

          {mode === "grocery" && !activeLists.length ? (
            <EmptyState
              title="No grocery lists yet"
              description="Create a list, add items, attach receipts, and log bought items as categorized expenses."
            />
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex gap-2">
              <Input placeholder="New grocery list title" value={newListTitle} onChange={(event) => setNewListTitle(event.target.value)} />
              <Button
                disabled={!newListTitle.trim()}
                onClick={async () => {
                  await createGroceryList(newListTitle.trim());
                  setNewListTitle("");
                  setMode("grocery");
                }}
              >
                Create
              </Button>
            </div>
          </Card>

          {activeLists.map((list) => (
            <GroceryListCard
              key={list.id}
              list={list}
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
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-outfit text-xl font-extrabold">Archived Lists</h3>
                  <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">Completed grocery runs stay available for review.</p>
                </div>
                <Pill>{archivedLists.length}</Pill>
              </div>
              <div className="mt-4 space-y-3">
                {archivedLists.map((list) => (
                  <div key={list.id} className="rounded-2xl border bg-[var(--surface-bg)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-outfit text-lg font-semibold">{list.title}</p>
                        <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">
                          {list.items.filter((item) => item.isBought).length} bought of {list.items.length} items
                        </p>
                      </div>
                      <Pill className="border-transparent bg-[var(--success)]/15 text-[var(--success)]">Completed</Pill>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-outfit text-2xl font-extrabold">Recent Transactions</h2>
            <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">Tap any expense to edit or delete it.</p>
          </div>
          <Pill>{monthExpenses.length}</Pill>
        </div>
        <div className="mt-5 space-y-3">
          {monthExpenses.slice(0, 10).map((expense) => (
            <button
              key={expense.id}
              type="button"
              onClick={() => setEditingExpenseId(expense.id)}
              className="flex w-full items-center justify-between gap-3 rounded-[24px] border bg-[var(--surface-bg)] p-4 text-left"
            >
              <div>
                <p className="font-inter text-sm font-bold text-[var(--text-primary)]">{expense.description}</p>
                <p className="font-inter text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  {getCategoryDisplayName(expense.category, categoryBudgets)} · {format(new Date(expense.expenseDate), "MMM d")}
                </p>
              </div>
              <span className="font-outfit text-xl font-semibold">{formatCurrency(expense.amount)}</span>
            </button>
          ))}
          {!monthExpenses.length ? <EmptyState title="No expenses yet" description="Add your first expense to start building the month view." /> : null}
        </div>
      </Card>

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
    </div>
  );
}

function GroceryListCard({
  list,
  expanded,
  onToggleExpand,
  onUpdateList,
  onDeleteList,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onToggleItem,
  onAddReceipts,
  onLogAsExpense,
}: {
  list: ReturnType<typeof useLedgr>["groceryLists"][number];
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdateList: ReturnType<typeof useLedgr>["updateGroceryList"];
  onDeleteList: ReturnType<typeof useLedgr>["deleteGroceryList"];
  onAddItem: ReturnType<typeof useLedgr>["addGroceryItem"];
  onUpdateItem: ReturnType<typeof useLedgr>["updateGroceryItem"];
  onDeleteItem: ReturnType<typeof useLedgr>["deleteGroceryItem"];
  onToggleItem: ReturnType<typeof useLedgr>["toggleGroceryItem"];
  onAddReceipts: ReturnType<typeof useLedgr>["addGroceryReceipts"];
  onLogAsExpense: ReturnType<typeof useLedgr>["logGroceryAsExpense"];
}) {
  const [draft, setDraft] = useState({ name: "", quantity: "1", estimatedPrice: "", category: "Grocery" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const totals = list.items.reduce(
    (acc, item) => {
      const value = item.quantity * item.estimatedPrice;
      acc.estimated += value;
      if (item.isBought) acc.bought += value;
      return acc;
    },
    { estimated: 0, bought: 0 },
  );
  const grouped = list.groupByCategory
    ? list.items.reduce<Record<string, typeof list.items>>((acc, item) => {
        acc[item.category] ??= [];
        acc[item.category].push(item);
        return acc;
      }, {})
    : { All: list.items };

  return (
    <Card>
      <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={onToggleExpand}>
        <div>
          <h3 className="font-outfit text-xl font-extrabold">{list.title}</h3>
          <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">{list.items.length} items · {formatCurrency(totals.estimated)} estimated</p>
        </div>
        {expanded ? <ChevronUp className="text-[var(--text-muted)]" /> : <ChevronDown className="text-[var(--text-muted)]" />}
      </button>

      {expanded ? (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={`rounded-2xl border px-4 py-2 font-inter text-sm font-bold ${list.groupByCategory ? "bg-[var(--accent)] text-black" : "bg-[var(--surface-bg)] text-[var(--text-secondary)]"}`}
              onClick={() => void onUpdateList(list.id, { groupByCategory: !list.groupByCategory })}
            >
              Category Grouping
            </button>
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border bg-[var(--surface-bg)] px-4 py-2 font-inter text-sm font-bold text-[var(--text-secondary)]">
              <Receipt size={16} />
              Attach Receipt
              <input type="file" multiple accept="image/*" className="hidden" onChange={(event) => event.target.files && void onAddReceipts(list.id, event.target.files)} />
            </label>
            {list.receiptPaths.length ? <Pill>{list.receiptPaths.length} receipt{list.receiptPaths.length === 1 ? "" : "s"}</Pill> : null}
            <Button variant="secondary" onClick={() => void onLogAsExpense(list.id)}>
              Log as Expense
            </Button>
            <Button variant="secondary" onClick={() => void onUpdateList(list.id, { status: "complete" })}>
              Mark Complete
            </Button>
            {confirmDelete ? (
              <>
                <Button variant="danger" onClick={() => void onDeleteList(list.id)}>
                  Confirm Delete
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="ghost" className="text-[var(--danger)]" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} />
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Item name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
            <Input type="number" min="1" placeholder="Qty" value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} />
            <Input type="number" min="0" placeholder="Estimated price" value={draft.estimatedPrice} onChange={(event) => setDraft((current) => ({ ...current, estimatedPrice: event.target.value }))} />
            <Select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
              {["Grocery", "Food", "Health", "Other"].map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </div>
          <Button
            disabled={!draft.name.trim()}
            onClick={async () => {
              await onAddItem(list.id, {
                name: draft.name,
                quantity: Number(draft.quantity || 1),
                estimatedPrice: Number(draft.estimatedPrice || 0),
                category: draft.category,
                isBought: false,
              });
              setDraft({ name: "", quantity: "1", estimatedPrice: "", category: draft.category });
            }}
          >
            Add Item
          </Button>

          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="space-y-3">
              {list.groupByCategory ? <Pill>{group}</Pill> : null}
              {items.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-2xl border bg-[var(--surface-bg)] p-4 md:grid-cols-[auto_1fr_auto_auto_auto] md:items-center">
                  <button type="button" onClick={() => void onToggleItem(item.id, !item.isBought)}>
                    {item.isBought ? <CheckCircle2 className="text-[var(--success)]" /> : <div className="h-5 w-5 rounded-full border" />}
                  </button>
                  <div>
                    <p className={`font-inter text-sm font-bold ${item.isBought ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>{item.name}</p>
                    <p className="font-inter text-xs font-medium text-[var(--text-secondary)]">
                      {item.quantity} × {formatCurrency(item.estimatedPrice)} · {item.category}
                    </p>
                  </div>
                  <Input className="w-24" type="number" value={String(item.quantity)} onChange={(event) => void onUpdateItem(item.id, { quantity: Number(event.target.value || 1) })} />
                  <Input className="w-32" type="number" value={String(item.estimatedPrice)} onChange={(event) => void onUpdateItem(item.id, { estimatedPrice: Number(event.target.value || 0) })} />
                  <Button variant="ghost" className="text-[var(--danger)]" onClick={() => void onDeleteItem(item.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          ))}

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-[var(--surface-bg)] p-4 shadow-none">
              <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Estimated Total</p>
              <p className="font-outfit mt-2 text-2xl font-semibold">{formatCurrency(totals.estimated)}</p>
            </Card>
            <Card className="bg-[var(--surface-bg)] p-4 shadow-none">
              <p className="font-inter text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Bought Total</p>
              <p className="font-outfit mt-2 text-2xl font-semibold">{formatCurrency(totals.bought)}</p>
            </Card>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
