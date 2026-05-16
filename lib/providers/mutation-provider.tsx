"use client";

import React, { createContext, useContext } from "react";
import { useAuth } from "./auth-provider";
import { useData } from "./data-provider";
import { advanceToSameDayNextMonth } from "@/lib/date";
import { autoCategorize } from "@/lib/store";
import { importExpensesFile } from "@/lib/import-export";
import { DEFAULT_CATEGORIES, Expense, GroceryItem, GroceryList } from "@/lib/types";
import { generateId } from "@/lib/utils";

export interface MutationContextValue {
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
  addBill: (payload: { name: string; amount: number; nextDueDate: string; icon: string; category: string }) => Promise<void>;
  deleteBill: (billId: string) => Promise<void>;
  payBill: (billId: string, amount: number) => Promise<void>;
  createGroceryList: (title: string) => Promise<string | null>;
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
  saveRolloverStep: (step: 1 | 2 | 3, rolloverAmount: number, updatedBudgetTotal?: number) => Promise<void>;
}

const MutationContext = createContext<MutationContextValue | undefined>(undefined);

export function MutationProvider({ children }: { children: React.ReactNode }) {
  const { supabase, user, pushToast } = useAuth();
  const {
    budgetMonth,
    budgetConfig,
    categoryBudgets,
    incomeSources,
    expenses,
    setExpenses,
    paginatedExpenses,
    setPaginatedExpenses,
    groceryLists,
    setGroceryLists,
    rolloverRecovery,
    setRolloverRecovery,
    refreshExpenses,
    refreshBills,
    refreshBudget,
    refreshGroceryLists,
    refreshCategories,
    refreshAll,
  } = useData();

  const upsertBudgetConfig = React.useCallback(async ({ totalBudget, allocations, incomeSources: sources, month }: any) => {
    if (!supabase || !user) return;
    const targetMonth = month ?? budgetMonth;
    const rolloverAmount = sources?.find((source: any) => source.isRollover)?.amount ?? 0;

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
      budget_amount: Number(budgetAmount),
      is_default: DEFAULT_CATEGORIES.includes(name),
      is_deleted: false,
    }));

    await supabase.from("budget_allocations").delete().eq("budget_month", targetMonth);
    if (allocationRows.length) await supabase.from("budget_allocations").insert(allocationRows);

    if (sources) {
      await supabase.from("income_sources").delete().eq("budget_month", targetMonth);
      if (sources.length) {
        await supabase.from("income_sources").insert(
          sources.map((source: any) => ({
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
    await Promise.all([refreshBudget(), refreshCategories()]);
  }, [budgetMonth, pushToast, refreshBudget, refreshCategories, supabase, user]);

  const addExpense = async ({ description, amount, category, expenseDate }: any) => {
    if (!supabase || !user) return;
    
    const newExpense: Expense = {
      id: generateId("expense"),
      description,
      amount,
      category: category || autoCategorize(description),
      expenseDate,
      createdAt: new Date().toISOString(),
      notes: null,
    };

    const previousExpenses = [...expenses];
    const previousPaginated = [...paginatedExpenses];
    
    setExpenses((current) => [newExpense, ...current]);
    setPaginatedExpenses((current) => [newExpense, ...current]);

    try {
      const { error } = await supabase.from("expenses").insert({
        id: newExpense.id,
        user_id: user.id,
        description: newExpense.description,
        amount: newExpense.amount,
        category_name: newExpense.category,
        expense_date: newExpense.expenseDate,
      });
      if (error) throw error;
      pushToast("Expense added.", "success");
    } catch (error) {
      setExpenses(previousExpenses);
      setPaginatedExpenses(previousPaginated);
      pushToast("Failed to add expense. Please try again.", "danger");
    }
    await refreshExpenses();
  };

  const updateExpense = async (expenseId: string, payload: Partial<Expense>) => {
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
    await refreshExpenses();
  };

  const deleteExpense = async (expenseId: string) => {
    if (!supabase) return;
    await supabase.from("expenses").delete().eq("id", expenseId);
    pushToast("Expense deleted.", "success");
    await refreshExpenses();
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
    await refreshCategories();
  };

  const deleteCategory = async (name: string) => {
    if (!supabase || DEFAULT_CATEGORIES.includes(name)) return;
    await supabase
      .from("budget_allocations")
      .update({ is_deleted: true })
      .eq("budget_month", budgetMonth)
      .eq("name", name);
    pushToast("Custom category deleted. Historical expenses were kept.", "success");
    await refreshCategories();
  };

  const addBill = async ({ name, amount, nextDueDate, icon, category }: any) => {
    if (!supabase || !user) return;
    await supabase.from("bills").insert({
      user_id: user.id,
      name,
      amount,
      next_due_date: nextDueDate,
      icon,
      category_name: category,
    });
    pushToast("Bill added.", "success");
    await refreshBills();
  };

  const deleteBill = async (billId: string) => {
    if (!supabase) return;
    await supabase.from("bills").delete().eq("id", billId);
    pushToast("Bill deleted.", "success");
    await refreshBills();
  };

  const payBill = async (billId: string, amount: number) => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("bills").select("*").eq("id", billId).single();
    if (!data) return;
    
    await Promise.all([
      supabase.from("expenses").insert({
        id: generateId("expense"),
        user_id: user.id,
        description: `Paid: ${data.name}`,
        amount,
        category_name: data.category_name,
        expense_date: new Date().toISOString(),
      }),
      supabase.from("bills").update({ next_due_date: advanceToSameDayNextMonth(data.next_due_date) }).eq("id", billId),
    ]);
    pushToast("Bill paid and renewed.", "success");
    await Promise.all([refreshExpenses(), refreshBills()]);
  };

  const createGroceryList = async (title: string) => {
    if (!supabase || !user) return null;
    const { data } = await supabase
      .from("grocery_lists")
      .insert({
        user_id: user.id,
        title,
        status: "active",
        group_by_category: false,
        receipt_paths: [],
      })
      .select("id")
      .single();

    pushToast("Grocery list created.", "success");
    await refreshGroceryLists();
    return data?.id ?? null;
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
    await refreshGroceryLists();
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
    await refreshGroceryLists();
  };

  const addGroceryItem = async (listId: string, payload: any) => {
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
    await refreshGroceryLists();
  };

  const updateGroceryItem = async (itemId: string, payload: any) => {
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
    await refreshGroceryLists();
  };

  const deleteGroceryItem = async (itemId: string) => {
    if (!supabase) return;
    await supabase.from("grocery_items").delete().eq("id", itemId);
    await refreshGroceryLists();
  };

  const toggleGroceryItem = async (itemId: string, isBought: boolean) => {
    if (!supabase) return;
    
    const previousLists = [...groceryLists];
    setGroceryLists((current) =>
      current.map((list) => ({
        ...list,
        items: list.items.map((item) => (item.id === itemId ? { ...item, isBought } : item)),
      })),
    );

    try {
      const { error } = await supabase.from("grocery_items").update({ is_bought: isBought }).eq("id", itemId);
      if (error) throw error;
    } catch (error) {
      setGroceryLists(previousLists);
      pushToast("Failed to update item. Please try again.", "danger");
    }
    await refreshGroceryLists();
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
    await refreshGroceryLists();
  };

  const addGroceryReceipts = async (listId: string, files: any) => {
    if (!supabase || !user) return;
    const list = groceryLists.find((entry) => entry.id === listId);
    if (!list) return;
    const uploadedPaths: string[] = [];
    for (const file of Array.from(files as any[])) {
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
    if (!supabase || !user) return;
    const list = groceryLists.find((entry) => entry.id === listId);
    if (!list) return;
    const grouped = list.items
      .filter((item) => item.isBought && item.estimatedPrice > 0)
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + item.estimatedPrice * item.quantity;
        return acc;
      }, {});
    const expenseRows = Object.entries(grouped).map(([category, amount]) => ({
      id: generateId("expense"),
      user_id: user.id,
      description: `Grocery: ${list.title}`,
      amount,
      category_name: category,
      expense_date: new Date().toISOString(),
    }));
    await Promise.all([
      ...(expenseRows.length ? [supabase.from("expenses").insert(expenseRows)] : []),
      supabase.from("grocery_lists").update({ status: "complete", completed_at: new Date().toISOString() }).eq("id", listId),
    ]);
    pushToast("Bought items logged as expenses.", "success");
    await Promise.all([refreshExpenses(), refreshGroceryLists()]);
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
      await refreshExpenses();
    }
    pushToast(`Imported ${result.imported} expenses.`, "success");
    return {
      imported: result.imported,
      duplicateSkipped: result.duplicateSkipped,
      formatSkipped: result.formatSkipped,
    };
  };

  const saveRolloverStep = async (step: 1 | 2 | 3, rolloverAmount: number, updatedBudgetTotal?: number) => {
    if (!supabase || !rolloverRecovery) return;
    const updatePayload: Record<string, unknown> = { step, rollover_amount: rolloverAmount };
    if (updatedBudgetTotal !== undefined) {
      updatePayload.updated_budget_total = updatedBudgetTotal;
    }
    const { data } = await supabase
      .from("rollover_recovery")
      .update(updatePayload)
      .eq("id", rolloverRecovery.id)
      .select("*")
      .single();
    if (data) {
      setRolloverRecovery((current) =>
        current
          ? {
              ...current,
              step,
              rolloverAmount,
              updatedBudgetTotal: updatedBudgetTotal !== undefined ? updatedBudgetTotal : current.updatedBudgetTotal,
              updatedAt: String(data.updated_at),
            }
          : current,
      );
    }
  };

  const resolveMonthEnd = async ({ rolloverAmount, keepSame, updatedBudgetTotal }: any) => {
    if (!supabase || !user || !rolloverRecovery || !budgetConfig) return;
    const sourceMonth = rolloverRecovery.sourceMonth;
    const sourceAllocations = categoryBudgets.filter((category) => !category.isDeleted);
    const nextTotal = keepSame ? budgetConfig.totalBudget : updatedBudgetTotal ?? budgetConfig.totalBudget;
    const carriedIncomeSources = incomeSources
      .filter((source) => !source.isRollover)
      .map((source) => ({ label: source.label, amount: source.amount, isRollover: false }));
    if (rolloverAmount > 0) {
      carriedIncomeSources.push({ label: "Rollover Amount", amount: rolloverAmount, isRollover: true });
    }

    await upsertBudgetConfig({
      totalBudget: nextTotal + rolloverAmount,
      allocations: Object.fromEntries(sourceAllocations.map((category) => [category.name, category.budgetAmount])),
      incomeSources: carriedIncomeSources,
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

  const value = {
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
  };

  return <MutationContext.Provider value={value}>{children}</MutationContext.Provider>;
}

export function useMutations() {
  const context = useContext(MutationContext);
  if (!context) throw new Error("useMutations must be used inside MutationProvider");
  return context;
}
