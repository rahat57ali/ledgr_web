"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check, CheckCircle2, ChevronDown, ChevronUp, Receipt, Trash2, X } from "lucide-react";
import { GroceryItem, GroceryList } from "@/lib/types";
import { Button, Card, Input, Pill, Select } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export function GroceryListCard({
  list,
  expanded,
  categories,
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
  list: GroceryList;
  expanded: boolean;
  categories: string[];
  onToggleExpand: () => void;
  onUpdateList: (listId: string, payload: Partial<GroceryList>) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onAddItem: (listId: string, payload: Omit<GroceryItem, "id" | "groceryListId" | "createdAt">) => Promise<void>;
  onUpdateItem: (itemId: string, payload: Partial<GroceryItem>) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onToggleItem: (itemId: string, isBought: boolean) => Promise<void>;
  onAddReceipts: (listId: string, files: FileList | File[]) => Promise<void>;
  onLogAsExpense: (listId: string) => Promise<void>;
}) {
  const defaultCategory = categories[0] ?? "Grocery";
  const [draft, setDraft] = useState({ name: "", quantity: "1", estimatedPrice: "", category: defaultCategory });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const boughtCount = list.items.filter((item) => item.isBought).length;
  const progressPercent = list.items.length ? Math.round((boughtCount / list.items.length) * 100) : 0;
  const allBought = list.items.length > 0 && boughtCount === list.items.length;
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
          <div className="flex items-center gap-2">
            <h3 className="font-outfit text-xl font-extrabold">{list.title}</h3>
            {list.receiptPaths.length > 0 ? (
              <Pill className="border-transparent bg-[var(--accent)]/15 text-[var(--accent)] py-0.5 px-2">
                <div className="flex items-center gap-1">
                  <Receipt size={12} />
                  <span>{list.receiptPaths.length}</span>
                </div>
              </Pill>
            ) : null}
          </div>
          <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">
            {format(new Date(list.createdAt), "MMM d, yyyy")} · {boughtCount}/{list.items.length} bought
          </p>
        </div>
        {expanded ? <ChevronUp className="text-[var(--text-muted)]" /> : <ChevronDown className="text-[var(--text-muted)]" />}
      </button>

      <div className="mt-4 h-2 rounded-full bg-[var(--warm-line)]">
        <div className="h-2 rounded-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
      </div>

      {expanded ? (
        <div className="mt-5 space-y-5">
          {allBought ? (
            <div className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-4">
              <p className="font-inter text-sm font-bold text-[var(--success)]">All items are marked bought. You can log them as expenses and archive this list.</p>
            </div>
          ) : null}

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
            {list.receiptPaths.length ? <Pill>{list.receiptPaths.length} receipts</Pill> : null}
            <Button variant="secondary" onClick={() => void onLogAsExpense(list.id)}>
              Log as Expense
            </Button>
            <Button variant="secondary" onClick={() => void onUpdateList(list.id, { status: "complete" })}>
              Mark Complete
            </Button>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <button type="button" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--success)]/15 text-[var(--success)]" onClick={() => void onDeleteList(list.id)}>
                  <Check size={16} />
                </button>
                <button type="button" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--danger)]/15 text-[var(--danger)]" onClick={() => setConfirmDelete(false)}>
                  <X size={16} />
                </button>
              </div>
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
              {categories.map((entry) => (
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
                name: draft.name.trim(),
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
                      {item.quantity} x {formatCurrency(item.estimatedPrice)} · {item.category}
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

export function ReadonlyArchivedListCard({ list }: { list: GroceryList }) {
  const [expanded, setExpanded] = useState(false);
  const boughtCount = list.items.filter((item) => item.isBought).length;
  const progressPercent = list.items.length ? Math.round((boughtCount / list.items.length) * 100) : 0;

  return (
    <Card className="bg-[var(--surface-bg)] shadow-none">
      <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setExpanded((current) => !current)}>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-outfit text-lg font-semibold">{list.title}</p>
            {list.receiptPaths.length > 0 ? (
              <Pill className="border-transparent bg-[var(--accent)]/15 text-[var(--accent)] py-0.5 px-2">
                <div className="flex items-center gap-1">
                  <Receipt size={12} />
                  <span>{list.receiptPaths.length}</span>
                </div>
              </Pill>
            ) : null}
          </div>
          <p className="font-inter text-sm font-medium text-[var(--text-secondary)]">
            {format(new Date(list.createdAt), "MMM d, yyyy")} · {boughtCount}/{list.items.length} bought
          </p>
        </div>
        {expanded ? <ChevronUp className="text-[var(--text-muted)]" /> : <ChevronDown className="text-[var(--text-muted)]" />}
      </button>
      <div className="mt-4 h-2 rounded-full bg-[var(--warm-line)]">
        <div className="h-2 rounded-full bg-[var(--success)] transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
      </div>
      {expanded ? (
        <div className="mt-4 space-y-2">
          {list.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border bg-[var(--card-bg)] px-4 py-3">
              <div>
                <p className={`font-inter text-sm font-bold ${item.isBought ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>{item.name}</p>
                <p className="font-inter text-xs font-medium text-[var(--text-secondary)]">
                  {item.quantity} x {formatCurrency(item.estimatedPrice)} · {item.category}
                </p>
              </div>
              <span className="font-outfit text-lg font-semibold">{formatCurrency(item.quantity * item.estimatedPrice)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
