import * as XLSX from "xlsx";
import { format } from "date-fns";
import { DEFAULT_CATEGORIES, Expense } from "@/lib/types";
import { autoCategorize } from "@/lib/store";
import { generateId } from "@/lib/utils";

export function exportExpenses(expenses: Expense[]) {
  const rows = expenses.map((expense) => ({
    date: format(new Date(expense.expenseDate), "yyyy-MM-dd"),
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
  const data = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ledgr_export_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeDate(rawDate: unknown) {
  if (typeof rawDate === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + rawDate * 24 * 60 * 60 * 1000);
    return format(date, "yyyy-MM-dd");
  }

  const text = String(rawDate ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

export async function importExpensesFile(file: File, existing: Expense[]) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

  const expenses: Omit<Expense, "createdAt">[] = [];
  let imported = 0;
  let duplicateSkipped = 0;
  let formatSkipped = 0;

  for (const row of rows) {
    const normalized: Record<string, unknown> = {};
    Object.keys(row).forEach((key) => {
      normalized[key.trim().toLowerCase()] = row[key];
    });

    const date = normalizeDate(normalized.date);
    const description = String(normalized.description ?? normalized.name ?? "").trim();
    const amount = Number(normalized.amount ?? 0);
    const rawCategory = String(normalized.category ?? "").trim();

    if (!date || !description || Number.isNaN(amount) || amount <= 0) {
      formatSkipped += 1;
      continue;
    }

    const duplicate = existing.some(
      (expense) =>
        format(new Date(expense.expenseDate), "yyyy-MM-dd") === date &&
        expense.description.trim().toLowerCase() === description.toLowerCase() &&
        expense.amount === amount,
    );

    if (duplicate) {
      duplicateSkipped += 1;
      continue;
    }

    const derivedCategory = rawCategory || autoCategorize(description);
    const safeCategory =
      DEFAULT_CATEGORIES.includes(derivedCategory) || rawCategory
        ? derivedCategory
        : "Other";

    expenses.push({
      id: generateId("expense"),
      description,
      amount,
      category: safeCategory,
      expenseDate: new Date(`${date}T12:00:00`).toISOString(),
    });
    imported += 1;
  }

  return { imported, duplicateSkipped, formatSkipped, expenses };
}
