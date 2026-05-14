import { CategoryBudget } from "@/lib/types";

export function getCategoryDisplayName(
  categoryName: string,
  categories: CategoryBudget[],
) {
  const match = categories.find((category) => category.name === categoryName);
  if (match?.isDeleted) return `${categoryName} (deleted)`;
  return categoryName;
}
