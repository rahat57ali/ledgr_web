export type ExpenseCategory = string;

export const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Grocery",
  "Health",
  "Other",
] satisfies ExpenseCategory[];

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  expenseDate: string;
  createdAt: string;
  notes?: string | null;
}

export interface CategoryBudget {
  id: string;
  name: string;
  budgetAmount: number;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export interface BudgetMonth {
  id: string;
  budgetMonth: string;
  totalBudget: number;
  rolloverAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeSource {
  id: string;
  budgetMonth: string;
  label: string;
  amount: number;
  isRollover: boolean;
}

export interface Bill {
  id: string;
  name: string;
  icon: string;
  amount: number;
  nextDueDate: string;
  category: ExpenseCategory;
  createdAt: string;
}

export interface GroceryItem {
  id: string;
  groceryListId: string;
  name: string;
  quantity: number;
  estimatedPrice: number;
  category: ExpenseCategory;
  isBought: boolean;
  createdAt: string;
}

export interface GroceryList {
  id: string;
  title: string;
  status: "active" | "complete";
  groupByCategory: boolean;
  receiptPaths: string[];
  createdAt: string;
  completedAt?: string | null;
  items: GroceryItem[];
}

export interface RolloverRecovery {
  id: string;
  sourceMonth: string;
  targetMonth: string;
  step: 1 | 2 | 3;
  rolloverAmount: number;
  status: "pending" | "completed";
  previousBudgetTotal: number;
  updatedBudgetTotal?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DynamicInsight {
  id:
    | "top-category"
    | "biggest-expense"
    | "no-spend-days"
    | "spending-velocity"
    | "category-overshoot"
    | "single-day-damage"
    | "most-frequent-expense";
  title: string;
  value: string;
  subtext: string;
}
