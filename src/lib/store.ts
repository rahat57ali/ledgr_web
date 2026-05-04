

export type ExpenseCategory = string;

export const DEFAULT_CATEGORIES: ExpenseCategory[] = ['Food', 'Grocery', 'Transport', 'Bills', 'Shopping', 'Health', 'Other'];

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  createdAt?: string; // ISO timestamp of when the expense was added to the app
  notes?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO date for next occurrence
  category: ExpenseCategory;
  isPaid?: boolean;
}

export interface Budget {
  total: number;
  categories: Record<ExpenseCategory, number>;
  budgetMonth?: string; // Format: YYYY-MM
}

export interface RolloverRecoveryState {
  step: 2 | 3;
  rolloverAmount: number;
}

export interface GroceryItem {
  id: string;
  name: string;
  estimatedPrice: number;
  quantity: number;
  category: ExpenseCategory;
  isBought: boolean;
}

export interface GroceryList {
  id: string;
  title: string;
  createdAt: string;
  status: 'active' | 'complete';
  items: GroceryItem[];
  photoUris: string[];
}
export function autoCategorize(name: string): ExpenseCategory {
  const lower = name.toLowerCase();
  if (lower.match(/uber|taxi|metro|train|bus|fuel|gas|lyft|careem/)) return 'Transport';
  if (lower.match(/grocery|supermarket|mart|store|milk|bread|eggs|fruits|vegetables/)) return 'Grocery';
  if (lower.match(/kfc|mcdonald|coffee|starbucks|food|lunch|dinner|restaurant|bakery/)) return 'Food';
  if (lower.match(/electric|water|internet|bill|rent|utility|wapda|ptcl/)) return 'Bills';
  if (lower.match(/amazon|mall|clothes|shopping|shoes|daraz|outfitters/)) return 'Shopping';
  if (lower.match(/pharmacy|doctor|hospital|medicine|clinic|chughtai/)) return 'Health';
  return 'Other';
}
