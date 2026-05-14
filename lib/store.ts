import { ExpenseCategory } from "@/lib/types";

export function autoCategorize(input: string): ExpenseCategory {
  const lower = input.toLowerCase();
  if (/(uber|taxi|metro|train|bus|fuel|gas|lyft|careem)/.test(lower)) return "Transport";
  if (/(grocery|supermarket|mart|store|milk|bread|eggs|fruits|vegetables)/.test(lower)) return "Grocery";
  if (/(kfc|mcdonald|coffee|starbucks|food|lunch|dinner|restaurant|bakery)/.test(lower)) return "Food";
  if (/(electric|water|internet|bill|rent|utility|wapda|ptcl)/.test(lower)) return "Bills";
  if (/(amazon|mall|clothes|shopping|shoes|daraz|outfitters)/.test(lower)) return "Shopping";
  if (/(pharmacy|doctor|hospital|medicine|clinic|chughtai)/.test(lower)) return "Health";
  return "Other";
}
