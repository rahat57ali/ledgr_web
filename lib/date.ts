import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";

export function getBudgetMonth(date = new Date()) {
  return format(date, "yyyy-MM");
}

export function getDaysRemainingInMonth(date = new Date()) {
  return differenceInCalendarDays(endOfMonth(date), startOfDay(date)) + 1;
}

export function getDaysInMonth(date = new Date()) {
  return differenceInCalendarDays(endOfMonth(date), startOfMonth(date)) + 1;
}

export function isToday(dateString: string) {
  return isSameDay(parseISO(dateString), new Date());
}

export function advanceToSameDayNextMonth(dateString: string) {
  const next = addMonths(parseISO(dateString), 1);
  return next.toISOString();
}
