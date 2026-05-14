"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { advanceToSameDayNextMonth, getBudgetMonth } from "@/lib/date";
import {
  billUrgencyLevel,
  filterExpensesByMonth,
  getCategoryTotals,
  getMonthlyInsights,
  sumExpenses,
} from "@/lib/calculations";
import { autoCategorize } from "@/lib/store";
import { importExpensesFile } from "@/lib/import-export";
import { DEFAULT_CATEGORIES, Bill, BudgetMonth, CategoryBudget, Expense, GroceryItem, GroceryList, IncomeSource, RolloverRecovery } from "@/lib/types";
import { generateId } from "@/lib/utils";

type ThemeMode = "dark" | "light";

interface Toast {
  id: string;
  title: string;
  tone?: "default" | "success" | "danger";
}

interface LedgrContextValue {
  supabaseReady: boolean;
  session: Session | null;
  user: User | null;
  loading: boolean;
  theme: ThemeMode;
  toggleTheme: () => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  signIn: (email: string, password: string, mode: "login" | "signup") => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  budgetMonth: string;
  budgetConfig: BudgetMonth | null;
  categoryBudgets: CategoryBudget[];
  incomeSources: IncomeSource[];
  expenses: Expense[];
  bills: Bill[];
  groceryLists: GroceryList[];
  rolloverRecovery: RolloverRecovery | null;
  refreshAll: () => Promise<void>;
  upsertBudgetConfig: (payload: {
    totalBudget: number;
    allocations: Record<string, number>;
    incomeSources?: { id?: string; label: string; amount: number; isRollover?: boolean }[];
    month?: string;
  }) => Promise<void>;
  addExpense: (payload: {
    description: string;
    amount: number;
    category?: string;
    expenseDate: string;
  }) => Promise<void>;
  updateExpense: (expenseId: string, payload: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
  addBill: (payload: { name: string; amount: number; nextDueDate: string; icon: string }) => Promise<void>;
  deleteBill: (billId: string) => Promise<void>;
  payBill: (billId: string, amount: number) => Promise<void>;
  createGroceryList: (title: string) => Promise<void>;
  updateGroceryList: (listId: string, payload: Partial<GroceryList>) => Promise<void>;
  deleteGroceryList: (listId: string) => Promise<void>;
  addGroceryItem: (listId: string, payload: Omit<GroceryItem, "id" | "groceryListId" | "createdAt">) => Promise<void>;
  updateGroceryItem: (itemId: string, payload: Partial<GroceryItem>) => Promise<void>;
  deleteGroceryItem: (itemId: string) => Promise<void>;
  toggleGroceryItem: (itemId: string, isBought: boolean) => Promise<void>;
  clearCompletedGroceryLists: () => Promise<void>;
  addGroceryReceipts: (listId: string, files: FileList | File[]) => Promise<void>;
  logGroceryAsExpense: (listId: string) => Promise<void>;
  importExpenseFile: (file: File) => Promise<{ imported: number; duplicateSkipped: number; formatSkipped: number }>;
  resolveMonthEnd: (payload: { rolloverAmount: number; keepSame: boolean; updatedBudgetTotal?: number }) => Promise<void>;
  saveRolloverStep: (step: 1 | 2 | 3, rolloverAmount: number) => Promise<void>;
  overdueBillCount: number;
}

const LedgrContext = createContext<LedgrContextValue | undefined>(undefined);
const THEME_KEY = "ledgr-theme-web";

export function LedgrProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => {
    const ready = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    return ready ? createClient() : null;
  }, []);
  const supabaseReady = Boolean(supabase);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [budgetConfig, setBudgetConfig] = useState<BudgetMonth | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
  const [rolloverRecovery, setRolloverRecovery] = useState<RolloverRecovery | null>(null);
  const budgetMonth = getBudgetMonth();

  const pushToast = (title: string, tone: Toast["tone"] = "default") => {
    const id = generateId("toast");
    setToasts((current) => [...current, { id, title, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  };

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const refreshAll = React.useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);

    const [
      budgetsRes,
      allocationsRes,
      incomesRes,
      expensesRes,
      billsRes,
      listsRes,
      itemsRes,
      recoveryRes,
    ] = await Promise.all([
      supabase.from("budget_months").select("*").order("budget_month", { ascending: false }),
      supabase.from("budget_allocations").select("*").order("name", { ascending: true }),
      supabase.from("income_sources").select("*").order("created_at", { ascending: true }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("bills").select("*").order("next_due_date", { ascending: true }),
      supabase.from("grocery_lists").select("*").order("created_at", { ascending: false }),
      supabase.from("grocery_items").select("*").order("created_at", { ascending: true }),
      supabase.from("rollover_recovery").select("*").eq("status", "pending").maybeSingle(),
    ]);

    const budgets = (budgetsRes.data ?? []) as Record<string, unknown>[];
    const currentBudget =
      budgets.find((row) => row.budget_month === budgetMonth) ??
      budgets[0] ??
      null;

    setBudgetConfig(
      currentBudget
        ? {
            id: String(currentBudget.id),
            budgetMonth: String(currentBudget.budget_month),
            totalBudget: Number(currentBudget.total_budget),
            rolloverAmount: Number(currentBudget.rollover_amount ?? 0),
            createdAt: String(currentBudget.created_at),
            updatedAt: String(currentBudget.updated_at),
          }
        : null,
    );

    setCategoryBudgets(
      ((allocationsRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        budgetAmount: Number(row.budget_amount),
        isDefault: Boolean(row.is_default),
        isDeleted: Boolean(row.is_deleted),
        createdAt: String(row.created_at),
      })),
    );

    setIncomeSources(
      ((incomesRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        budgetMonth: String(row.budget_month),
        label: String(row.label),
        amount: Number(row.amount),
        isRollover: Boolean(row.is_rollover),
      })),
    );

    setExpenses(
      ((expensesRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        description: String(row.description),
        amount: Number(row.amount),
        category: String(row.category_name),
        expenseDate: String(row.expense_date),
        createdAt: String(row.created_at),
        notes: row.notes ? String(row.notes) : null,
      })),
    );

    setBills(
      ((billsRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        icon: String(row.icon),
        amount: Number(row.amount),
        nextDueDate: String(row.next_due_date),
        category: String(row.category_name),
        createdAt: String(row.created_at),
      })),
    );

    const groupedItems = ((itemsRes.data ?? []) as Record<string, unknown>[]).reduce<Record<string, GroceryItem[]>>((acc, row) => {
      const listId = String(row.grocery_list_id);
      acc[listId] ??= [];
      acc[listId].push({
        id: String(row.id),
        groceryListId: listId,
        name: String(row.name),
        quantity: Number(row.quantity),
        estimatedPrice: Number(row.estimated_price),
        category: String(row.category_name),
        isBought: Boolean(row.is_bought),
        createdAt: String(row.created_at),
      });
      return acc;
    }, {});

    setGroceryLists(
      ((listsRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        title: String(row.title),
        status: row.status === "complete" ? "complete" : "active",
        groupByCategory: Boolean(row.group_by_category),
        receiptPaths: (row.receipt_paths as string[] | null) ?? [],
        createdAt: String(row.created_at),
        completedAt: row.completed_at ? String(row.completed_at) : null,
        items: groupedItems[String(row.id)] ?? [],
      })),
    );

    const pendingRecovery = recoveryRes.data as Record<string, unknown> | null;
    setRolloverRecovery(
      pendingRecovery
        ? {
            id: String(pendingRecovery.id),
            sourceMonth: String(pendingRecovery.source_month),
            targetMonth: String(pendingRecovery.target_month),
            step: Number(pendingRecovery.step) as 1 | 2 | 3,
            rolloverAmount: Number(pendingRecovery.rollover_amount),
            status: pendingRecovery.status === "completed" ? "completed" : "pending",
            previousBudgetTotal: Number(pendingRecovery.previous_budget_total),
            updatedBudgetTotal: pendingRecovery.updated_budget_total ? Number(pendingRecovery.updated_budget_total) : null,
            createdAt: String(pendingRecovery.created_at),
            updatedAt: String(pendingRecovery.updated_at),
          }
        : null,
    );

    setLoading(false);
  }, [budgetMonth, supabase, user]);

  useEffect(() => {
    if (user) {
      void refreshAll();
    } else {
      setBudgetConfig(null);
      setCategoryBudgets([]);
      setIncomeSources([]);
      setExpenses([]);
      setBills([]);
      setGroceryLists([]);
      setRolloverRecovery(null);
    }
  }, [refreshAll, user]);

  useEffect(() => {
    async function ensureMonthRecovery() {
      if (!supabase || !user || loading) return;
      if (budgetConfig?.budgetMonth === budgetMonth) return;
      if (rolloverRecovery) return;

      const latestMonth = budgetConfig?.budgetMonth;
      if (!latestMonth) return;

      const monthExpenses = filterExpensesByMonth(expenses, latestMonth);
      const spent = sumExpenses(monthExpenses);
      const remaining = budgetConfig.totalBudget - spent;

      const { data } = await supabase
        .from("rollover_recovery")
        .insert({
          user_id: user.id,
          source_month: latestMonth,
          target_month: budgetMonth,
          step: remaining > 0 ? 1 : 2,
          rollover_amount: 0,
          status: "pending",
          previous_budget_total: budgetConfig.totalBudget,
        })
        .select("*")
        .single();

      if (data) {
        setRolloverRecovery({
          id: String(data.id),
          sourceMonth: String(data.source_month),
          targetMonth: String(data.target_month),
          step: Number(data.step) as 1 | 2 | 3,
          rolloverAmount: Number(data.rollover_amount),
          status: "pending",
          previousBudgetTotal: Number(data.previous_budget_total),
          updatedBudgetTotal: data.updated_budget_total ? Number(data.updated_budget_total) : null,
          createdAt: String(data.created_at),
          updatedAt: String(data.updated_at),
        });
      }
    }

    void ensureMonthRecovery();
  }, [budgetConfig, budgetMonth, expenses, loading, rolloverRecovery, supabase, user]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem(THEME_KEY, next);
  };

  const dismissToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const signIn = async (email: string, password: string, mode: "login" | "signup") => {
    if (!supabase) return { error: "Supabase is not configured." };
    const response =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    if (response.error) return { error: response.error.message };
    pushToast(mode === "login" ? "Signed in successfully." : "Account created. Check your inbox if email confirmation is enabled.", "success");
    return {};
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const upsertBudgetConfig = React.useCallback<LedgrContextValue["upsertBudgetConfig"]>(async ({ totalBudget, allocations, incomeSources: sources, month }) => {
    if (!supabase || !user) return;
    const targetMonth = month ?? budgetMonth;
    const rolloverAmount = sources?.find((source) => source.isRollover)?.amount ?? 0;

    await supabase.from("budget_months").upsert({
      user_id: user.id,
      budget_month: targetMonth,
      total_budget: totalBudget,
      rollover_amount: rolloverAmount,
    });

    const allocationRows = Object.entries(allocations).map(([name, budgetAmount]) => ({
      user_id: user.id,
      budget_month: targetMonth,
      name,
      budget_amount: budgetAmount,
      is_default: DEFAULT_CATEGORIES.includes(name),
      is_deleted: false,
    }));

    await supabase.from("budget_allocations").delete().eq("budget_month", targetMonth);
    if (allocationRows.length) await supabase.from("budget_allocations").insert(allocationRows);

    if (sources) {
      await supabase.from("income_sources").delete().eq("budget_month", targetMonth);
      if (sources.length) {
        await supabase.from("income_sources").insert(
          sources.map((source) => ({
            user_id: user.id,
            budget_month: targetMonth,
            label: source.label,
            amount: source.amount,
            is_rollover: Boolean(source.isRollover),
          })),
        );
      }
    }

    pushToast("Budget configuration saved.", "success");
    await refreshAll();
  }, [budgetMonth, pushToast, refreshAll, supabase, user]);

  useEffect(() => {
    async function bootstrapFirstMonth() {
      if (!supabase || !user || loading) return;
      if (budgetConfig) return;
      await upsertBudgetConfig({
        totalBudget: 50000,
        allocations: {
          Food: 15000,
          Transport: 8000,
          Bills: 15000,
          Shopping: 7000,
          Grocery: 10000,
          Health: 3000,
          Other: 2000,
        },
        incomeSources: [{ label: "Salary", amount: 50000, isRollover: false }],
      });
    }
    void bootstrapFirstMonth();
  }, [budgetConfig, loading, supabase, upsertBudgetConfig, user]);

  const addExpense: LedgrContextValue["addExpense"] = async ({ description, amount, category, expenseDate }) => {
    if (!supabase || !user) return;
    await supabase.from("expenses").insert({
      id: generateId("expense"),
      user_id: user.id,
      description,
      amount,
      category_name: category || autoCategorize(description),
      expense_date: expenseDate,
    });
    pushToast("Expense added.", "success");
    await refreshAll();
  };

  const updateExpense: LedgrContextValue["updateExpense"] = async (expenseId, payload) => {
    if (!supabase) return;
    await supabase
      .from("expenses")
      .update({
        description: payload.description,
        amount: payload.amount,
        category_name: payload.category,
        expense_date: payload.expenseDate,
        notes: payload.notes,
      })
      .eq("id", expenseId);
    pushToast("Expense updated.", "success");
    await refreshAll();
  };

  const deleteExpense = async (expenseId: string) => {
    if (!supabase) return;
    await supabase.from("expenses").delete().eq("id", expenseId);
    pushToast("Expense deleted.", "success");
    await refreshAll();
  };

  const addCategory = async (name: string) => {
    if (!supabase || !user) return;
    if (categoryBudgets.some((category) => category.name.toLowerCase() === name.toLowerCase())) return;
    await supabase.from("budget_allocations").insert({
      user_id: user.id,
      budget_month: budgetMonth,
      name,
      budget_amount: 0,
      is_default: false,
      is_deleted: false,
    });
    pushToast("Custom category added.", "success");
    await refreshAll();
  };

  const deleteCategory = async (name: string) => {
    if (!supabase || DEFAULT_CATEGORIES.includes(name)) return;
    await supabase
      .from("budget_allocations")
      .update({ is_deleted: true })
      .eq("budget_month", budgetMonth)
      .eq("name", name);
    pushToast("Custom category deleted. Historical expenses were kept.", "success");
    await refreshAll();
  };

  const addBill: LedgrContextValue["addBill"] = async ({ name, amount, nextDueDate, icon }) => {
    if (!supabase || !user) return;
    await supabase.from("bills").insert({
      user_id: user.id,
      name,
      amount,
      next_due_date: nextDueDate,
      icon,
      category_name: "Bills",
    });
    pushToast("Bill added.", "success");
    await refreshAll();
  };

  const deleteBill = async (billId: string) => {
    if (!supabase) return;
    await supabase.from("bills").delete().eq("id", billId);
    pushToast("Bill deleted.", "success");
    await refreshAll();
  };

  const payBill = async (billId: string, amount: number) => {
    if (!supabase) return;
    const bill = bills.find((entry) => entry.id === billId);
    if (!bill) return;
    await addExpense({
      description: `Paid: ${bill.name}`,
      amount,
      category: "Bills",
      expenseDate: new Date().toISOString(),
    });
    await supabase.from("bills").update({ next_due_date: advanceToSameDayNextMonth(bill.nextDueDate) }).eq("id", billId);
    pushToast("Bill paid and renewed.", "success");
    await refreshAll();
  };

  const createGroceryList = async (title: string) => {
    if (!supabase || !user) return;
    await supabase.from("grocery_lists").insert({
      user_id: user.id,
      title,
      status: "active",
      group_by_category: false,
      receipt_paths: [],
    });
    pushToast("Grocery list created.", "success");
    await refreshAll();
  };

  const updateGroceryList = async (listId: string, payload: Partial<GroceryList>) => {
    if (!supabase) return;
    await supabase
      .from("grocery_lists")
      .update({
        title: payload.title,
        status: payload.status,
        group_by_category: payload.groupByCategory,
        receipt_paths: payload.receiptPaths,
        completed_at: payload.status === "complete" ? new Date().toISOString() : null,
      })
      .eq("id", listId);
    await refreshAll();
  };

  const deleteGroceryList = async (listId: string) => {
    if (!supabase) return;
    const list = groceryLists.find((entry) => entry.id === listId);
    if (list?.receiptPaths.length) {
      await supabase.storage.from("receipts").remove(list.receiptPaths);
    }
    await supabase.from("grocery_items").delete().eq("grocery_list_id", listId);
    await supabase.from("grocery_lists").delete().eq("id", listId);
    pushToast("Grocery list deleted.", "success");
    await refreshAll();
  };

  const addGroceryItem = async (listId: string, payload: Omit<GroceryItem, "id" | "groceryListId" | "createdAt">) => {
    if (!supabase || !user) return;
    await supabase.from("grocery_items").insert({
      user_id: user.id,
      grocery_list_id: listId,
      name: payload.name,
      quantity: payload.quantity,
      estimated_price: payload.estimatedPrice,
      category_name: payload.category,
      is_bought: payload.isBought,
    });
    await refreshAll();
  };

  const updateGroceryItem = async (itemId: string, payload: Partial<GroceryItem>) => {
    if (!supabase) return;
    await supabase
      .from("grocery_items")
      .update({
        name: payload.name,
        quantity: payload.quantity,
        estimated_price: payload.estimatedPrice,
        category_name: payload.category,
        is_bought: payload.isBought,
      })
      .eq("id", itemId);
    await refreshAll();
  };

  const deleteGroceryItem = async (itemId: string) => {
    if (!supabase) return;
    await supabase.from("grocery_items").delete().eq("id", itemId);
    await refreshAll();
  };

  const toggleGroceryItem = async (itemId: string, isBought: boolean) => {
    if (!supabase) return;
    await supabase.from("grocery_items").update({ is_bought: isBought }).eq("id", itemId);
    await refreshAll();
  };

  const clearCompletedGroceryLists = async () => {
    if (!supabase) return;
    const completed = groceryLists.filter((list) => list.status === "complete");
    const receipts = completed.flatMap((list) => list.receiptPaths);
    if (receipts.length) await supabase.storage.from("receipts").remove(receipts);
    const ids = completed.map((list) => list.id);
    if (!ids.length) return;
    await supabase.from("grocery_items").delete().in("grocery_list_id", ids);
    await supabase.from("grocery_lists").delete().in("id", ids);
    pushToast("Completed grocery lists cleared.", "success");
    await refreshAll();
  };

  const addGroceryReceipts = async (listId: string, files: FileList | File[]) => {
    if (!supabase || !user) return;
    const list = groceryLists.find((entry) => entry.id === listId);
    if (!list) return;
    const uploadedPaths: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${listId}/${generateId("receipt")}.${ext}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (!error) uploadedPaths.push(path);
    }
    await updateGroceryList(listId, {
      receiptPaths: [...list.receiptPaths, ...uploadedPaths],
    });
    pushToast("Receipt uploaded.", "success");
  };

  const logGroceryAsExpense = async (listId: string) => {
    const list = groceryLists.find((entry) => entry.id === listId);
    if (!list) return;
    const grouped = list.items
      .filter((item) => item.isBought && item.estimatedPrice > 0)
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + item.estimatedPrice * item.quantity;
        return acc;
      }, {});

    for (const [category, amount] of Object.entries(grouped)) {
      await addExpense({
        description: `Grocery: ${list.title}`,
        amount,
        category,
        expenseDate: new Date().toISOString(),
      });
    }

    await updateGroceryList(listId, { status: "complete" });
    pushToast("Bought items logged as expenses.", "success");
  };

  const importExpenseFile = async (file: File) => {
    if (!supabase || !user) return { imported: 0, duplicateSkipped: 0, formatSkipped: 0 };
    const result = await importExpensesFile(file, expenses);
    if (result.expenses.length) {
      await supabase.from("expenses").insert(
        result.expenses.map((expense) => ({
          user_id: user.id,
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          category_name: categoryBudgets.some((category) => category.name === expense.category) ? expense.category : "Other",
          expense_date: expense.expenseDate,
        })),
      );
      await refreshAll();
    }
    pushToast(`Imported ${result.imported} expenses.`, "success");
    return {
      imported: result.imported,
      duplicateSkipped: result.duplicateSkipped,
      formatSkipped: result.formatSkipped,
    };
  };

  const saveRolloverStep = async (step: 1 | 2 | 3, rolloverAmount: number) => {
    if (!supabase || !rolloverRecovery) return;
    const { data } = await supabase
      .from("rollover_recovery")
      .update({ step, rollover_amount: rolloverAmount })
      .eq("id", rolloverRecovery.id)
      .select("*")
      .single();
    if (data) {
      setRolloverRecovery((current) =>
        current
          ? { ...current, step, rolloverAmount, updatedAt: String(data.updated_at) }
          : current,
      );
    }
  };

  const resolveMonthEnd: LedgrContextValue["resolveMonthEnd"] = async ({ rolloverAmount, keepSame, updatedBudgetTotal }) => {
    if (!supabase || !user || !rolloverRecovery || !budgetConfig) return;
    const sourceMonth = rolloverRecovery.sourceMonth;
    const sourceAllocations = categoryBudgets.filter((category) => !category.isDeleted);
    const nextTotal = keepSame ? budgetConfig.totalBudget : updatedBudgetTotal ?? budgetConfig.totalBudget;

    await upsertBudgetConfig({
      totalBudget: nextTotal + rolloverAmount,
      allocations: Object.fromEntries(sourceAllocations.map((category) => [category.name, category.budgetAmount])),
      incomeSources: rolloverAmount > 0 ? [{ label: "Rollover Amount", amount: rolloverAmount, isRollover: true }] : [],
      month: budgetMonth,
    });

    await supabase
      .from("rollover_recovery")
      .update({
        status: "completed",
        rollover_amount: rolloverAmount,
        updated_budget_total: keepSame ? budgetConfig.totalBudget : updatedBudgetTotal ?? budgetConfig.totalBudget,
      })
      .eq("id", rolloverRecovery.id);

    setRolloverRecovery(null);
    pushToast(`Month rollover from ${sourceMonth} completed.`, "success");
    await refreshAll();
  };

  const overdueBillCount = bills.filter((bill) => billUrgencyLevel(bill.nextDueDate) !== "normal").length;

  const value: LedgrContextValue = {
    supabaseReady,
    session,
    user,
    loading,
    theme,
    toggleTheme,
    toasts,
    dismissToast,
    signIn,
    signOut,
    budgetMonth,
    budgetConfig,
    categoryBudgets,
    incomeSources,
    expenses,
    bills,
    groceryLists,
    rolloverRecovery,
    refreshAll,
    upsertBudgetConfig,
    addExpense,
    updateExpense,
    deleteExpense,
    addCategory,
    deleteCategory,
    addBill,
    deleteBill,
    payBill,
    createGroceryList,
    updateGroceryList,
    deleteGroceryList,
    addGroceryItem,
    updateGroceryItem,
    deleteGroceryItem,
    toggleGroceryItem,
    clearCompletedGroceryLists,
    addGroceryReceipts,
    logGroceryAsExpense,
    importExpenseFile,
    resolveMonthEnd,
    saveRolloverStep,
    overdueBillCount,
  };

  return <LedgrContext.Provider value={value}>{children}</LedgrContext.Provider>;
}

export function useLedgr() {
  const context = useContext(LedgrContext);
  if (!context) throw new Error("useLedgr must be used inside LedgrProvider");
  return context;
}

export function useCurrentMonthExpenseSummary() {
  const { budgetConfig, budgetMonth, categoryBudgets, expenses } = useLedgr();
  const monthExpenses = useMemo(() => filterExpensesByMonth(expenses, budgetMonth), [budgetMonth, expenses]);
  const totalSpent = useMemo(() => sumExpenses(monthExpenses), [monthExpenses]);
  const categoryTotals = useMemo(() => getCategoryTotals(monthExpenses), [monthExpenses]);
  const insights = useMemo(
    () =>
      getMonthlyInsights(
        expenses,
        budgetMonth,
        budgetConfig?.totalBudget ?? 0,
        Object.fromEntries(categoryBudgets.map((category) => [category.name, category.budgetAmount])),
      ),
    [budgetConfig?.totalBudget, budgetMonth, categoryBudgets, expenses],
  );

  return {
    monthExpenses,
    totalSpent,
    categoryTotals,
    insights,
  };
}
