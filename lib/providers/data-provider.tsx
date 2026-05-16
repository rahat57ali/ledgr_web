"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { format, addMonths } from "date-fns";
import { useAuth } from "./auth-provider";
import { getBudgetMonth } from "@/lib/date";
import { billUrgencyLevel, filterExpensesByMonth, sumExpenses } from "@/lib/calculations";
import { Bill, BudgetMonth, CategoryBudget, Expense, GroceryItem, GroceryList, IncomeSource, RolloverRecovery } from "@/lib/types";

export interface DataContextValue {
  budgetMonth: string;
  budgetConfig: BudgetMonth | null;
  setBudgetConfig: React.Dispatch<React.SetStateAction<BudgetMonth | null>>;
  categoryBudgets: CategoryBudget[];
  setCategoryBudgets: React.Dispatch<React.SetStateAction<CategoryBudget[]>>;
  incomeSources: IncomeSource[];
  setIncomeSources: React.Dispatch<React.SetStateAction<IncomeSource[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  paginatedExpenses: Expense[];
  setPaginatedExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  hasMoreExpenses: boolean;
  bills: Bill[];
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
  groceryLists: GroceryList[];
  setGroceryLists: React.Dispatch<React.SetStateAction<GroceryList[]>>;
  rolloverRecovery: RolloverRecovery | null;
  setRolloverRecovery: React.Dispatch<React.SetStateAction<RolloverRecovery | null>>;
  refreshAll: () => Promise<void>;
  refreshExpenses: (month?: string) => Promise<void>;
  refreshBills: () => Promise<void>;
  refreshBudget: () => Promise<void>;
  refreshGroceryLists: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  loadMoreExpenses: () => Promise<void>;
  overdueBillCount: number;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { supabase, user, loading: authLoading } = useAuth();
  
  const [budgetConfig, setBudgetConfig] = useState<BudgetMonth | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paginatedExpenses, setPaginatedExpenses] = useState<Expense[]>([]);
  const [expenseOffset, setExpenseOffset] = useState(0);
  const [hasMoreExpenses, setHasMoreExpenses] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
  const [rolloverRecovery, setRolloverRecovery] = useState<RolloverRecovery | null>(null);
  
  const budgetMonth = getBudgetMonth();

  const refreshExpenses = React.useCallback(
    async (month?: string) => {
      if (!supabase || !user) return;
      const targetMonth = month ?? budgetMonth;

      const { data: monthData } = await supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", `${targetMonth}-01`)
        .lt("expense_date", format(addMonths(new Date(`${targetMonth}-01T12:00:00`), 1), "yyyy-MM-01"))
        .order("expense_date", { ascending: false });

      setExpenses(
        ((monthData ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          description: String(row.description),
          amount: Number(row.amount),
          category: String(row.category_name),
          expenseDate: String(row.expense_date),
          createdAt: String(row.created_at),
          notes: row.notes ? String(row.notes) : null,
        })),
      );

      const { data: recentData } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(50);

      setPaginatedExpenses(
        ((recentData ?? []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          description: String(row.description),
          amount: Number(row.amount),
          category: String(row.category_name),
          expenseDate: String(row.expense_date),
          createdAt: String(row.created_at),
          notes: row.notes ? String(row.notes) : null,
        })),
      );
      setExpenseOffset(50);
      setHasMoreExpenses((recentData?.length ?? 0) === 50);
    },
    [budgetMonth, supabase, user],
  );

  const loadMoreExpenses = async () => {
    if (!supabase || !user || !hasMoreExpenses) return;
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .range(expenseOffset, expenseOffset + 49);

    if (data && data.length > 0) {
      const newItems = (data as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        description: String(row.description),
        amount: Number(row.amount),
        category: String(row.category_name),
        expenseDate: String(row.expense_date),
        createdAt: String(row.created_at),
        notes: row.notes ? String(row.notes) : null,
      }));
      setPaginatedExpenses((current) => [...current, ...newItems]);
      setExpenseOffset((prev) => prev + data.length);
      setHasMoreExpenses(data.length === 50);
    } else {
      setHasMoreExpenses(false);
    }
  };

  const refreshBills = React.useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("bills").select("*").order("next_due_date", { ascending: true });
    setBills(
      ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        icon: String(row.icon),
        amount: Number(row.amount),
        nextDueDate: String(row.next_due_date),
        category: String(row.category_name),
        createdAt: String(row.created_at),
      })),
    );
  }, [supabase, user]);

  const refreshBudget = React.useCallback(async () => {
    if (!supabase || !user) return;
    const budgetsRes = await supabase.from("budget_months").select("*").order("budget_month", { ascending: false });
    const budgets = (budgetsRes.data ?? []) as Record<string, unknown>[];
    const currentBudget = budgets.find((row) => row.budget_month === budgetMonth) ?? budgets[0] ?? null;
    const activeBudgetMonth = String(currentBudget?.budget_month ?? budgetMonth);

    const [incomesRes, recoveryRes] = await Promise.all([
      supabase.from("income_sources").select("*").eq("budget_month", activeBudgetMonth).order("created_at", { ascending: true }),
      supabase.from("rollover_recovery").select("*").eq("status", "pending").maybeSingle(),
    ]);

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

    setIncomeSources(
      ((incomesRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        budgetMonth: String(row.budget_month),
        label: String(row.label),
        amount: Number(row.amount),
        isRollover: Boolean(row.is_rollover),
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
  }, [budgetMonth, supabase, user]);

  const refreshGroceryLists = React.useCallback(async () => {
    if (!supabase || !user) return;
    const [listsRes, itemsRes] = await Promise.all([
      supabase.from("grocery_lists").select("*").order("created_at", { ascending: false }),
      supabase.from("grocery_items").select("*").order("created_at", { ascending: true }),
    ]);

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
  }, [supabase, user]);

  const refreshCategories = React.useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("budget_allocations").select("*").eq("budget_month", budgetMonth).order("name", { ascending: true });
    setCategoryBudgets(
      ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        budgetAmount: Number(row.budget_amount),
        isDefault: Boolean(row.is_default),
        isDeleted: Boolean(row.is_deleted),
        createdAt: String(row.created_at),
      })),
    );
  }, [budgetMonth, supabase, user]);

  const refreshAll = React.useCallback(async () => {
    await Promise.all([
      refreshBudget(),
      refreshExpenses(),
      refreshBills(),
      refreshGroceryLists(),
      refreshCategories(),
    ]);
  }, [refreshBudget, refreshExpenses, refreshBills, refreshGroceryLists, refreshCategories]);

  useEffect(() => {
    if (user) {
      void refreshAll();
    } else if (!authLoading) {
      setBudgetConfig(null);
      setCategoryBudgets([]);
      setIncomeSources([]);
      setExpenses([]);
      setPaginatedExpenses([]);
      setBills([]);
      setGroceryLists([]);
      setRolloverRecovery(null);
    }
  }, [refreshAll, user, authLoading]);

  useEffect(() => {
    async function ensureMonthRecovery() {
      if (!supabase || !user || authLoading) return;
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
  }, [budgetConfig, budgetMonth, expenses, authLoading, rolloverRecovery, supabase, user]);

  const overdueBillCount = bills.filter((bill) => billUrgencyLevel(bill.nextDueDate) !== "normal").length;

  const value = {
    budgetMonth,
    budgetConfig,
    setBudgetConfig,
    categoryBudgets,
    setCategoryBudgets,
    incomeSources,
    setIncomeSources,
    expenses,
    setExpenses,
    paginatedExpenses,
    setPaginatedExpenses,
    hasMoreExpenses,
    bills,
    setBills,
    groceryLists,
    setGroceryLists,
    rolloverRecovery,
    setRolloverRecovery,
    refreshAll,
    refreshExpenses,
    refreshBills,
    refreshBudget,
    refreshGroceryLists,
    refreshCategories,
    loadMoreExpenses,
    overdueBillCount,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside DataProvider");
  return context;
}
