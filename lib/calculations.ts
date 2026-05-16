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

  const insights: Array<DynamicInsight & { eligible: boolean; rank: number }> = [];
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  insights.push({
    id: "top-category",
    title: "Top Spending Category",
    value: topCategory?.[0] ?? "No recorded category",
    subtext: topCategory ? `${Math.round((topCategory[1] / Math.max(1, totalSpent)) * 100)}% of monthly spend` : "Track a few expenses to see category dominance.",
    eligible: true,
    rank: 100,
  });

  const biggestExpense = [...monthExpenses].sort((a, b) => b.amount - a.amount)[0];
  insights.push({
    id: "biggest-expense",
    title: "Biggest Single Expense",
    value: biggestExpense?.description ?? "No expense recorded",
    subtext: biggestExpense ? `${biggestExpense.amount.toLocaleString()} PKR` : "Add transactions to surface your biggest hit.",
    eligible: true,
    rank: 99,
  });

  const spendDays = new Set(monthExpenses.map((expense) => getDate(parseISO(expense.expenseDate))));
  const noSpendDays = daysInMonth - spendDays.size;
  insights.push({
    id: "no-spend-days",
    title: "No-Spend Days",
    value: `${Math.max(0, noSpendDays)} days`,
    subtext: noSpendDays >= 5 ? "You kept the wallet closed more often than usual." : "This only appears when five or more no-spend days are logged.",
    eligible: noSpendDays >= 5,
    rank: 70,
  });

  const firstHalfSpent = monthExpenses
    .filter((expense) => getDate(parseISO(expense.expenseDate)) <= 15)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const firstHalfRatio = totalSpent ? firstHalfSpent / totalSpent : 0;
  insights.push({
    id: "spending-velocity",
    title: "Spending Velocity",
    value: `${Math.round(firstHalfRatio * 100)}%`,
    subtext:
      firstHalfRatio > 0.65
        ? "You spent unusually fast early in the month."
        : firstHalfRatio < 0.35
          ? "You held spending back early in the month."
          : "Velocity only appears when first-half spending is above 65% or below 35%.",
    eligible: firstHalfRatio > 0.65 || firstHalfRatio < 0.35,
    rank: 60,
  });

  const biggestOvershoot = Object.entries(categoryTotals)
    .map(([category, spent]) => ({
      category,
      overshoot: spent - (categoryLimits[category] ?? 0),
      limit: categoryLimits[category] ?? 0,
    }))
    .filter((entry) => entry.limit > 0 && entry.overshoot > entry.limit * 0.5)
    .sort((a, b) => b.overshoot - a.overshoot)[0];
  insights.push({
    id: "category-overshoot",
    title: "Biggest Category Overshoot",
    value: biggestOvershoot?.category ?? "No overshoot",
    subtext: biggestOvershoot ? `Exceeded by ${Math.round(biggestOvershoot.overshoot).toLocaleString()} PKR` : "This appears only when a category exceeds budget by more than 50%.",
    eligible: Boolean(biggestOvershoot),
    rank: 55,
  });

  const dailyTotals = monthExpenses.reduce<Record<string, number>>((acc, expense) => {
    const key = format(parseISO(expense.expenseDate), "yyyy-MM-dd");
    acc[key] = (acc[key] ?? 0) + expense.amount;
    return acc;
  }, {});
  const biggestDay = Object.entries(dailyTotals).sort((a, b) => b[1] - a[1])[0];
  const biggestDayPercent = biggestDay && totalSpent > 0 ? biggestDay[1] / totalSpent : 0;
  insights.push({
    id: "single-day-damage",
    title: "Single Day Damage",
    value: biggestDay ? format(parseISO(biggestDay[0]), "MMM d") : "No spike day",
    subtext: biggestDayPercent > 0.2 ? `${Math.round(biggestDayPercent * 100)}% of the month happened in one day` : "This appears only when one day accounts for more than 20% of total spend.",
    eligible: biggestDayPercent > 0.2,
    rank: 50,
  });

  const descriptionFrequency = monthExpenses.reduce<Record<string, number>>((acc, expense) => {
    const key = expense.description.trim().toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const mostFrequent = Object.entries(descriptionFrequency).sort((a, b) => b[1] - a[1])[0];
  insights.push({
    id: "most-frequent-expense",
    title: "Most Frequent Expense",
    value: mostFrequent?.[0] ?? "No repeat pattern",
    subtext: mostFrequent && mostFrequent[1] >= 5 ? `Appeared ${mostFrequent[1]} times` : "This appears only when a description repeats at least five times.",
    eligible: Boolean(mostFrequent && mostFrequent[1] >= 5),
    rank: 45,
  });

  const required = insights.filter((insight) => insight.id === "top-category" || insight.id === "biggest-expense");
  const eligibleExtras = insights
    .filter((insight) => insight.id !== "top-category" && insight.id !== "biggest-expense" && insight.eligible)
    .sort((a, b) => b.rank - a.rank);
  const fallbackExtras = insights
    .filter((insight) => insight.id !== "top-category" && insight.id !== "biggest-expense" && !insight.eligible)
    .sort((a, b) => b.rank - a.rank);

  return [...required, ...eligibleExtras, ...fallbackExtras].slice(0, 4).map(({ eligible: _eligible, rank: _rank, ...rest }) => rest);
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

export function getTopSpendingItems(expenses: Expense[], limit = 5) {
  return [...expenses].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

export function getRepeatPurchases(expenses: Expense[]) {
  const counts = expenses.reduce<Record<string, number>>((acc, e) => {
    const key = e.description.trim().toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .filter(([_, count]) => count > 1)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getPaceAndProjection(expenses: Expense[], totalBudget: number, monthKey: string) {
  const totalSpent = sumExpenses(expenses);
  const date = new Date(`${monthKey}-01T12:00:00`);
  const daysInMonth = getDaysInMonth(date);
  
  // Current day in the context of the viewed month
  const today = new Date();
  const isCurrentMonth = format(today, "yyyy-MM") === monthKey;
  const elapsedDays = isCurrentMonth ? today.getDate() : daysInMonth;
  
  const dailyAverage = totalSpent / Math.max(1, elapsedDays);
  const projection = dailyAverage * daysInMonth;
  const isOverBudget = projection > totalBudget;

  return {
    totalSpent,
    projection,
    isOverBudget,
    percentOfBudget: totalBudget > 0 ? (projection / totalBudget) * 100 : 0,
    dailyAverage,
  };
}

export function getSpendTypeBreakdown(expenses: Expense[]) {
  const mapping: Record<string, "essential" | "non-essential"> = {
    Bills: "essential",
    Grocery: "essential",
    Health: "essential",
    Food: "non-essential",
    Shopping: "non-essential",
    Transport: "non-essential",
    Entertainment: "non-essential",
  };

  return expenses.reduce(
    (acc, e) => {
      const type = mapping[e.category] ?? "non-essential";
      acc[type] += e.amount;
      return acc;
    },
    { essential: 0, "non-essential": 0 }
  );
}

export function getHighestSpendingDays(expenses: Expense[], limit = 5) {
  const daily = expenses.reduce<Record<string, number>>((acc, e) => {
    const key = format(parseISO(e.expenseDate), "yyyy-MM-dd");
    acc[key] = (acc[key] ?? 0) + e.amount;
    return acc;
  }, {});

  return Object.entries(daily)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function getWeekOverWeek(expenses: Expense[], monthKey: string) {
  const weeks = [
    { start: 1, end: 7 },
    { start: 8, end: 14 },
    { start: 15, end: 21 },
    { start: 22, end: 31 },
  ];

  const weeklyTotals = weeks.map((week) => {
    const amount = expenses
      .filter((e) => {
        const d = parseISO(e.expenseDate).getDate();
        return d >= week.start && d <= week.end;
      })
      .reduce((sum, e) => sum + e.amount, 0);
    return amount;
  });

  return weeklyTotals.map((total, i) => {
    const prev = weeklyTotals[i - 1];
    const diff = prev !== undefined ? total - prev : 0;
    const percent = prev ? (diff / prev) * 100 : 0;
    return { week: i + 1, total, diff, percent };
  });
}

export function getDynamicTips(
  expenses: Expense[],
  monthKey: string,
  totalBudget: number,
  categoryLimits: Record<string, number>
) {
  const tips: string[] = [];
  const totalSpent = sumExpenses(expenses);
  const categoryTotals = getCategoryTotals(expenses);

  if (totalSpent > totalBudget && totalBudget > 0) {
    tips.push("You've exceeded your total monthly budget. Consider reviewing non-essential spending.");
  }

  if ((categoryTotals["Food"] ?? 0) > (categoryLimits["Food"] ?? 0) && categoryLimits["Food"] > 0) {
    tips.push("Food spending is over budget. Reducing dining out could help balance the month.");
  }

  const repeats = getRepeatPurchases(expenses);
  if (repeats.some(r => r.count >= 3)) {
    const topRepeat = repeats.sort((a, b) => b.count - a.count)[0];
    tips.push(`You've purchased '${topRepeat.name}' ${topRepeat.count} times. Buying in bulk might save you money.`);
  }

  if (totalSpent < totalBudget * 0.5 && new Date().getDate() > 20) {
    tips.push("Excellent work! You're well under budget for this late in the month.");
  }

  return tips.length > 0 ? tips : ["No specific tips yet. Keep logging to see dynamic suggestions!"];
}
