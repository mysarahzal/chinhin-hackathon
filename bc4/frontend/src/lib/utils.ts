import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyRM(value: number): string {
  if (value >= 1_000_000) {
    return `RM ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `RM ${(value / 1_000).toFixed(1)}K`;
  }
  return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatRunId(index: number, total: number): string {
  return `RUN-${String(total - index).padStart(3, "0")}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-MY", {
    day: "numeric", month: "short", year: "numeric",
  });
}
