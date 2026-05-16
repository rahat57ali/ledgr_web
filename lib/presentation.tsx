import { Coffee, CreditCard, Flame, Globe, Heart, Home, MoreHorizontal, ShoppingBag, ShoppingBasket, Train, type LucideIcon, Zap } from "lucide-react";

export function getCategoryIcon(categoryName: string): LucideIcon {
  const normalized = categoryName.trim().toLowerCase();
  if (normalized === "food") return Coffee;
  if (normalized === "transport") return Train;
  if (normalized === "bills") return Home;
  if (normalized === "shopping") return ShoppingBag;
  if (normalized === "grocery") return ShoppingBasket;
  if (normalized === "health") return Heart;
  return MoreHorizontal;
}

export function getBillIcon(icon: string, name: string): LucideIcon {
  const normalizedIcon = icon.trim().toLowerCase();
  const normalizedName = name.trim().toLowerCase();

  if (normalizedIcon === "zap" || normalizedName.includes("electric")) return Zap;
  if (normalizedIcon === "flame" || normalizedName.includes("gas")) return Flame;
  if (normalizedIcon === "globe" || normalizedName.includes("internet") || normalizedName.includes("wifi")) return Globe;
  if (normalizedIcon === "home" || normalizedName.includes("rent")) return Home;
  return CreditCard;
}

export function getBillUrgencyMeta(nextDueDate: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(nextDueDate);
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueStart.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return {
      level: "overdue" as const,
      label: `Overdue by ${Math.abs(diffDays)}d`,
      cardClass: "bg-[var(--danger)]/10 border-[var(--danger)]/30",
      textClass: "text-[var(--danger)]",
      pillClass: "border-transparent bg-[var(--danger)]/15 text-[var(--danger)]",
    };
  }

  if (diffDays <= 3) {
    return {
      level: "warning" as const,
      label: `Due in ${diffDays}d`,
      cardClass: "bg-[var(--warning)]/10 border-[var(--warning)]/30",
      textClass: "text-[var(--warning)]",
      pillClass: "border-transparent bg-[var(--warning)]/15 text-[var(--warning)]",
    };
  }

  return {
    level: "normal" as const,
    label: `Due in ${diffDays}d`,
    cardClass: "",
    textClass: "text-[var(--text-secondary)]",
    pillClass: "",
  };
}
