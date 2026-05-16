"use client";

import React, { createContext, useContext, useMemo } from "react";
import { AuthProvider, useAuth } from "./providers/auth-provider";
import { DataProvider, useData } from "./providers/data-provider";
import { MutationProvider, useMutations } from "./providers/mutation-provider";
import { filterExpensesByMonth, getCategoryTotals, getMonthlyInsights, sumExpenses } from "./calculations";

// Combine all types for the public context
type LedgrContextValue = ReturnType<typeof useAuth> & 
                        ReturnType<typeof useData> & 
                        ReturnType<typeof useMutations>;

const LedgrContext = createContext<LedgrContextValue | undefined>(undefined);

function LedgrConsumer({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const data = useData();
  const mutations = useMutations();

  const value = useMemo(() => ({
    ...auth,
    ...data,
    ...mutations,
  }), [auth, data, mutations]);

  return <LedgrContext.Provider value={value as LedgrContextValue}>{children}</LedgrContext.Provider>;
}

export function LedgrProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        <MutationProvider>
          <LedgrConsumer>
            {children}
          </LedgrConsumer>
        </MutationProvider>
      </DataProvider>
    </AuthProvider>
  );
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
