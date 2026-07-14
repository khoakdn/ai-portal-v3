import type { BudgetLine, MonthlyDataPoint } from "@/lib/budget/data";
import {
  DEFAULT_ANNUAL_BUDGET_TOTAL,
  INITIAL_BUDGET_LINES,
  MONTHLY_DATA,
} from "@/lib/budget/data";

export const ALLOCATED_BUDGET_STORAGE_KEY = "delta_allocated_budget";

const STORAGE_KEY = "marketing_budget";

export interface MarketingBudgetSnapshot {
  annualCeiling: number;
  lines: BudgetLine[];
  monthlyData: MonthlyDataPoint[];
}

function cloneDefaultLines(): BudgetLine[] {
  return INITIAL_BUDGET_LINES.map((line) => ({
    ...line,
    quarterlyBudget: [...line.quarterlyBudget] as [number, number, number, number],
    quarterlySpent: [...line.quarterlySpent] as [number, number, number, number],
  }));
}

function isBudgetLine(value: unknown): value is BudgetLine {
  if (!value || typeof value !== "object") return false;
  const line = value as BudgetLine;
  return (
    typeof line.id === "string" &&
    typeof line.annualBudget === "number" &&
    Array.isArray(line.quarterlyBudget) &&
    Array.isArray(line.quarterlySpent)
  );
}

function parseSnapshot(raw: string): MarketingBudgetSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as MarketingBudgetSnapshot;
    if (
      typeof parsed.annualCeiling !== "number" ||
      !Array.isArray(parsed.lines) ||
      !parsed.lines.every(isBudgetLine) ||
      !Array.isArray(parsed.monthlyData)
    ) {
      return null;
    }
    return {
      annualCeiling: parsed.annualCeiling,
      lines: parsed.lines.map((line) => ({
        ...line,
        quarterlyBudget: [...line.quarterlyBudget] as [number, number, number, number],
        quarterlySpent: [...line.quarterlySpent] as [number, number, number, number],
      })),
      monthlyData: parsed.monthlyData.map((point) => ({ ...point })),
    };
  } catch {
    return null;
  }
}

export function loadAllocatedBudget(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ALLOCATED_BUDGET_STORAGE_KEY);
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function saveAllocatedBudget(amount: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ALLOCATED_BUDGET_STORAGE_KEY, String(amount));
  } catch (err) {
    console.error("[delta_allocated_budget] Failed to persist allocated budget:", err);
  }
}

export function loadMarketingBudgetSnapshot(): MarketingBudgetSnapshot | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return parseSnapshot(raw);
}

export function saveMarketingBudgetSnapshot(snapshot: MarketingBudgetSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.error("[marketing_budget] Failed to persist budget snapshot:", err);
  }
}

export function getDefaultMarketingBudgetSnapshot(): MarketingBudgetSnapshot {
  return {
    annualCeiling: DEFAULT_ANNUAL_BUDGET_TOTAL,
    lines: cloneDefaultLines(),
    monthlyData: MONTHLY_DATA.map((point) => ({ ...point })),
  };
}

export function getZeroMarketingBudgetSnapshot(): MarketingBudgetSnapshot {
  return {
    annualCeiling: 0,
    lines: cloneDefaultLines().map((line) => ({
      ...line,
      annualBudget: 0,
      quarterlyBudget: [0, 0, 0, 0] as [number, number, number, number],
      quarterlySpent: [0, 0, 0, 0] as [number, number, number, number],
    })),
    monthlyData: MONTHLY_DATA.map((point) => ({
      month: point.month,
      budgeted: 0,
      spent: 0,
    })),
  };
}

export function clearMarketingBudgetSnapshot(): void {
  saveMarketingBudgetSnapshot(getZeroMarketingBudgetSnapshot());
}

export function reset2026SpendingInSnapshot(
  snapshot: MarketingBudgetSnapshot
): MarketingBudgetSnapshot {
  return {
    annualCeiling: snapshot.annualCeiling,
    lines: snapshot.lines.map((line) => ({
      ...line,
      quarterlySpent: [0, 0, 0, 0] as [number, number, number, number],
    })),
    monthlyData: snapshot.monthlyData.map((point) => ({
      ...point,
      spent: 0,
    })),
  };
}
