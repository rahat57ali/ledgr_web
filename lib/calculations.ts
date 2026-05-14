import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDate,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
} from "date-fns";
import { DynamicInsight, Expense } from "@/lib/types";
import { getDaysInMonth, getDaysRemainingInMonth } from "@/lib/date";

export function filterExpensesByMonth(expenses: Expense[], month: string) {
  return expenses.filter((expense) => format(parseISO(expense.expenseDate), "yyyy-MM") === month);
}

export function sumExpenses(expenses: Expense[]) {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

export function getCategoryTotals(expenses: Expense[]) {
  return expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
    return acc;
  }, {});
}

export function getDailyAllowance(totalBudget: number, spent: number) {
  const remaining = totalBudget - spent;
  const daysLeft = getDaysRemainingInMonth();
  return Math.max(0, remaining / Math.max(1, daysLeft));
}

export function getDailyStatus(totalBudget: number, spent: number) {
  const remaining = totalBudget - spent;
  const daysLeft = getDaysRemainingInMonth();
  const allowance = Math.max(0, remaining / Math.max(1, daysLeft));
  const monthTarget = totalBudget / Math.max(1, getDaysInMonth());
  const ratio = monthTarget > 0 ? allowance / monthTarget : 0;

  if (ratio >= 1.5) return "Comfortable";
  if (ratio >= 1) return "On Track";
  if (ratio >= 0.6) return "Tight";
  if (ratio >= 0.3) return "Critical";
  return "Overspent";
}

export function getDailyStatusDescription(status: string) {
  switch (status) {
    case "Comfortable":
      return "You're spending well below your planned pace.";
    case "On Track":
      return "Your daily budget lines up cleanly with the month.";
    case "Tight":
      return "There's still room, but spending needs more care.";
    case "Critical":
      return "Your remaining monthly room is getting very small.";
    default:
      return "You have exceeded a sustainable pace for the month.";
  }
}

export function getMonthlyInsights(
  expenses: Expense[],
  budgetMonth: string,
  totalBudget: number,
  categoryLimits: Record<string, number>,
) {
  const monthExpenses = filterExpensesByMonth(expenses, budgetMonth);
  const totalSpent = sumExpenses(monthExpenses);
  const daysInMonth = getDaysInMonth(new Date(`${budgetMonth}-01T00:00:00`));
  const categoryTotals = getCategoryTotals(monthExpenses);

  const insights: DynamicInsight[] = [];
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    insights.push({
      id: "top-category",
      title: "Top Spending Category",
      value: topCategory[0],
      subtext: `${Math.round((topCategory[1] / Math.max(1, totalSpent)) * 100)}% of monthly spend`,
    });
  }

  const biggestExpense = [...monthExpenses].sort((a, b) => b.amount - a.amount)[0];
  if (biggestExpense) {
    insights.push({
      id: "biggest-expense",
      title: "Biggest Single Expense",
      value: biggestExpense.description,
      subtext: biggestExpense.amount.toLocaleString(),
    });
  }

  const spendDays = new Set(monthExpenses.map((expense) => getDate(parseISO(expense.expenseDate))));
  const noSpendDays = daysInMonth - spendDays.size;
  if (noSpendDays >= 5) {
    insights.push({
      id: "no-spend-days",
      title: "No-Spend Days",
      value: `${noSpendDays} days`,
      subtext: "You kept the wallet closed more often than usual.",
    });
  }

  const firstHalfSpent = monthExpenses
    .filter((expense) => getDate(parseISO(expense.expenseDate)) <= 15)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const firstHalfRatio = totalSpent ? firstHalfSpent / totalSpent : 0;
  if (firstHalfRatio > 0.65 || firstHalfRatio < 0.35) {
    insights.push({
      id: "spending-velocity",
      title: "Spending Velocity",
      value: `${Math.round(firstHalfRatio * 100)}%`,
      subtext: firstHalfRatio > 0.65 ? "You spent unusually fast early in the month." : "You held spending back early in the month.",
    });
  }

  const biggestOvershoot = Object.entries(categoryTotals)
    .map(([category, spent]) => ({
      category,
      overshoot: spent - (categoryLimits[category] ?? 0),
      limit: categoryLimits[category] ?? 0,
    }))
    .filter((entry) => entry.limit > 0 && entry.overshoot > entry.limit * 0.5)
    .sort((a, b) => b.overshoot - a.overshoot)[0];
  if (biggestOvershoot) {
    insights.push({
      id: "category-overshoot",
      title: "Biggest Category Overshoot",
      value: biggestOvershoot.category,
      subtext: `Exceeded by ${Math.round(biggestOvershoot.overshoot).toLocaleString()}`,
    });
  }

  const dailyTotals = monthExpenses.reduce<Record<string, number>>((acc, expense) => {
    const key = format(parseISO(expense.expenseDate), "yyyy-MM-dd");
    acc[key] = (acc[key] ?? 0) + expense.amount;
    return acc;
  }, {});
  const biggestDay = Object.entries(dailyTotals).sort((a, b) => b[1] - a[1])[0];
  if (biggestDay && totalSpent > 0 && biggestDay[1] / totalSpent > 0.2) {
    insights.push({
      id: "single-day-damage",
      title: "Single Day Damage",
      value: format(parseISO(biggestDay[0]), "MMM d"),
      subtext: `${Math.round((biggestDay[1] / totalSpent) * 100)}% of the month happened in one day`,
    });
  }

  const descriptionFrequency = monthExpenses.reduce<Record<string, number>>((acc, expense) => {
    const key = expense.description.trim().toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const mostFrequent = Object.entries(descriptionFrequency).sort((a, b) => b[1] - a[1])[0];
  if (mostFrequent && mostFrequent[1] >= 5) {
    insights.push({
      id: "most-frequent-expense",
      title: "Most Frequent Expense",
      value: mostFrequent[0],
      subtext: `Appeared ${mostFrequent[1]} times`,
    });
  }

  const required = insights.filter((insight) => insight.id === "top-category" || insight.id === "biggest-expense");
  const extras = insights.filter((insight) => !required.some((req) => req.id === insight.id));
  return [...required, ...extras].slice(0, 4);
}

export function getExpenseCalendarMarks(expenses: Expense[], month: string) {
  const start = startOfMonth(new Date(`${month}-01T00:00:00`));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const total = expenses
      .filter((expense) => format(parseISO(expense.expenseDate), "yyyy-MM-dd") === key)
      .reduce((sum, expense) => sum + expense.amount, 0);

    return { key, total };
  });
}

export function billUrgencyLevel(nextDueDate: string) {
  const due = parseISO(nextDueDate);
  const today = new Date();
  if (isBefore(due, today) && format(due, "yyyy-MM-dd") !== format(today, "yyyy-MM-dd")) return "overdue";
  if (!isAfter(due, new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000))) return "soon";
  return "normal";
}
